import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import {
  createActivePropertyDirect,
  registerHostUser,
  type RegisteredHostUser,
} from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import {
  authHeader,
  registerUser,
  uniqueEmail,
  type RegisteredUser,
} from '../helpers/test-data.helper';

async function registerAdmin(
  app: INestApplication,
): Promise<Awaited<ReturnType<typeof registerUser>> & { accessToken: string }> {
  const admin = await registerUser(app, { email: uniqueEmail('admin') });
  const prisma = app.get(PrismaService);
  await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: admin.email, password: admin.password })
    .expect(201);
  return { ...admin, accessToken: login.body.data.accessToken as string };
}

async function createBookingWithFailure(
  app: INestApplication,
  host: RegisteredHostUser,
  guest: RegisteredUser,
  category: 'RENT_CAPTURE_FAILED' | 'PAYOUT_TRANSFER_FAILED' = 'PAYOUT_TRANSFER_FAILED',
): Promise<{ bookingId: string; propertyId: string; failureId: string }> {
  const property = await createActivePropertyDirect(app, host);
  const prisma = app.get(PrismaService);
  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      guestId: guest.userId,
      status: 'CONFIRMED',
      checkIn: new Date('2025-08-10'),
      checkOut: new Date('2025-08-13'),
      guestCount: 2,
      currency: 'AMD',
      nightlyRate: 25000,
      nightsCount: 3,
      totalAmount: 75000,
      payoutStatus: 'FAILED',
    },
  });
  const failure = await prisma.paymentFailure.create({
    data: {
      bookingId: booking.id,
      category,
      message: 'Stripe test failure for e2e',
      stripeErrorCode: 'balance_insufficient',
    },
  });
  return { bookingId: booking.id, propertyId: property.id, failureId: failure.id };
}

describe('Admin payment failures (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetE2eDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists payment failures for an admin', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { failureId } = await createBookingWithFailure(app, host, guest);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    expect(
      (response.body.data.data as Array<{ id: string }>).some((row) => row.id === failureId),
    ).toBe(true);
  });

  it('filters by bookingId, propertyId, hostId, guestId, and search', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const guest = await registerUser(app, {
      email: uniqueEmail('guest'),
      firstName: 'Filterina',
      lastName: 'Guestson',
    });
    const { bookingId, propertyId, failureId } = await createBookingWithFailure(app, host, guest);

    const byBooking = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ bookingId })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(byBooking.body.data.data).toHaveLength(1);
    expect(byBooking.body.data.data[0].id).toBe(failureId);

    const byProperty = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ propertyId })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(byProperty.body.data.data).toHaveLength(1);

    const byHost = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ hostId: host.hostProfileId })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(byHost.body.data.data).toHaveLength(1);

    const byGuest = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ guestId: guest.userId })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(byGuest.body.data.data).toHaveLength(1);

    const bySearch = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ search: 'Filterina' })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(bySearch.body.data.data).toHaveLength(1);

    const noMatch = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ search: 'NobodyWithThisName' })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(noMatch.body.data.data).toHaveLength(0);
  });

  it('filters by category and resolved', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    await createBookingWithFailure(app, host, guest, 'RENT_CAPTURE_FAILED');

    const byCategory = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ category: 'RENT_CAPTURE_FAILED' })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(byCategory.body.data.data).toHaveLength(1);

    const unresolved = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ resolved: false })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(unresolved.body.data.total).toBeGreaterThanOrEqual(1);

    const resolved = await request(app.getHttpServer())
      .get('/api/v1/admin/payment-failures')
      .query({ resolved: true })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(resolved.body.data.total).toBe(0);
  });

  it('marks a payment failure resolved', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { failureId } = await createBookingWithFailure(app, host, guest);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/payment-failures/${failureId}/resolve`)
      .set(authHeader(admin.accessToken))
      .expect(200);

    const prisma = app.get(PrismaService);
    const updated = await prisma.paymentFailure.findUnique({ where: { id: failureId } });
    expect(updated?.resolved).toBe(true);
    expect(updated?.resolvedAt).not.toBeNull();
    expect(updated?.resolvedByUserId).toBe(admin.userId);
  });

  it('returns 404 when resolving an unknown payment failure', async () => {
    const admin = await registerAdmin(app);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/payment-failures/does-not-exist/resolve')
      .set(authHeader(admin.accessToken))
      .expect(404);
  });

  it('rejects non-admin staff resolving a payment failure', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { failureId } = await createBookingWithFailure(app, host, guest);
    const staff = await registerUser(app, { email: uniqueEmail('staff') });
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: staff.userId }, data: { role: 'STAFF' } });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: staff.email, password: staff.password })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/payment-failures/${failureId}/resolve`)
      .set(authHeader(login.body.data.accessToken as string))
      .expect(403);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/payment-failures').expect(401);
  });
});
