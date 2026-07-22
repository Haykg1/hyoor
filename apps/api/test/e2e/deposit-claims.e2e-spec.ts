import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import {
  createGuestBooking,
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

const DEPOSIT_AMOUNT = 20000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

async function createDepositBooking(
  app: INestApplication,
  host: RegisteredHostUser,
  guest: RegisteredUser,
  opts: { checkOutOffsetDays?: number } = {},
): Promise<{ bookingId: string; propertyId: string }> {
  const { bookingId, propertyId } = await createGuestBooking(app, host, guest);
  const prisma = app.get(PrismaService);
  const checkOut = new Date(Date.now() + (opts.checkOutOffsetDays ?? -1) * DAY_MS);
  const checkIn = new Date(checkOut.getTime() - 3 * DAY_MS);
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      paymentStatus: 'AUTHORIZED',
      checkIn,
      checkOut,
      securityDeposit: DEPOSIT_AMOUNT,
      stripeDepositPaymentIntentId: `pi_mock_deposit_${bookingId}`,
      depositStatus: 'AUTHORIZED',
    },
  });
  return { bookingId, propertyId };
}

function validClaim(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    amount: 15000,
    reason: 'Guest left cigarette burns on the sofa upholstery.',
    ...overrides,
  };
}

describe('Deposit claims (e2e)', () => {
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

  describe('POST /bookings/:id/deposit-release', () => {
    it('releases the deposit hold for the owning host', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-release`)
        .set(authHeader(host.accessToken))
        .expect(200);
      expect(response.body.data.depositStatus).toBe('RELEASED');
      const prisma = app.get(PrismaService);
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(booking.depositStatus).toBe('RELEASED');
    });

    it('rejects a host that does not own the booking', async () => {
      const host = await registerHostUser(app);
      const otherHost = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-release`)
        .set(authHeader(otherHost.accessToken))
        .expect(403);
    });

    it('rejects when no deposit hold exists', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createGuestBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-release`)
        .set(authHeader(host.accessToken))
        .expect(400);
    });

    it('rejects when a claim is already pending', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-release`)
        .set(authHeader(host.accessToken))
        .expect(409);
    });

    it('rejects unauthenticated access', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings/any-id/deposit-release')
        .expect(401);
    });
  });

  describe('POST /bookings/:id/deposit-claim/photos/presigned-url', () => {
    it('returns an upload URL scoped to the booking claim prefix', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, propertyId } = await createDepositBooking(app, host, guest);
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim/photos/presigned-url`)
        .set(authHeader(host.accessToken))
        .send({ mimeType: 'image/jpeg' })
        .expect(201);
      expect(response.body.data.uploadUrl).toEqual(expect.any(String));
      expect(response.body.data.key).toMatch(
        new RegExp(`^properties/${propertyId}/deposit-claims/${bookingId}/`),
      );
    });

    it('rejects an unsupported mime type', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim/photos/presigned-url`)
        .set(authHeader(host.accessToken))
        .send({ mimeType: 'application/pdf' })
        .expect(400);
    });

    it('rejects a guest (non-host) caller', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim/photos/presigned-url`)
        .set(authHeader(guest.accessToken))
        .send({ mimeType: 'image/jpeg' })
        .expect(403);
    });
  });

  describe('POST /bookings/:id/deposit-claim', () => {
    it('creates a pending claim with evidence keys', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, propertyId } = await createDepositBooking(app, host, guest);
      const evidenceKey = `properties/${propertyId}/deposit-claims/${bookingId}/photo-1.jpg`;
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim({ evidenceKeys: [evidenceKey] }))
        .expect(201);
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.amount).toBe(15000);
      expect(response.body.data.evidenceKeys).toEqual([evidenceKey]);
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${bookingId}`)
        .set(authHeader(host.accessToken))
        .expect(200);
      expect(detail.body.data.securityDepositClaim.status).toBe('PENDING');
      expect(detail.body.data.securityDepositClaim.amount).toBe(15000);
    });

    it('rejects an amount above the deposit held', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim({ amount: DEPOSIT_AMOUNT + 1 }))
        .expect(400);
    });

    it('rejects more than 5 evidence photos', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, propertyId } = await createDepositBooking(app, host, guest);
      const keys = Array.from(
        { length: 6 },
        (_, i) => `properties/${propertyId}/deposit-claims/${bookingId}/photo-${i}.jpg`,
      );
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim({ evidenceKeys: keys }))
        .expect(400);
    });

    it('rejects evidence keys outside the booking claim prefix', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim({ evidenceKeys: ['properties/other/whatever.jpg'] }))
        .expect(400);
    });

    it('rejects a claim before checkout', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest, {
        checkOutOffsetDays: 2,
      });
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(400);
    });

    it('rejects a claim after the window has passed', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest, {
        checkOutOffsetDays: -5,
      });
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(400);
    });

    it('rejects a duplicate claim', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(409);
    });
  });

  describe('admin review', () => {
    it('lists pending claims with booking context', async () => {
      const admin = await registerAdmin(app);
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(201);
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/deposit-claims')
        .set(authHeader(admin.accessToken))
        .expect(200);
      expect(response.body.data).toHaveLength(1);
      const claim = response.body.data[0];
      expect(claim.bookingId).toBe(bookingId);
      expect(claim.securityDeposit).toBe(DEPOSIT_AMOUNT);
      expect(claim.propertyTitle).toEqual(expect.any(String));
      expect(claim.guestName).toEqual(expect.any(String));
      expect(claim.hostName).toEqual(expect.any(String));
    });

    it('approves a claim and captures the deposit', async () => {
      const admin = await registerAdmin(app);
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      const created = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(201);
      const claimId = created.body.data.id as string;
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/deposit-claims/${claimId}`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'APPROVED', reviewNote: 'Photos confirm the damage.' })
        .expect(200);
      expect(response.body.data.status).toBe('APPROVED');
      const prisma = app.get(PrismaService);
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(booking.depositStatus).toBe('CAPTURED');
    });

    it('rejects a claim and releases the deposit', async () => {
      const admin = await registerAdmin(app);
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      const created = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(201);
      const claimId = created.body.data.id as string;
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/deposit-claims/${claimId}`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'REJECTED' })
        .expect(200);
      expect(response.body.data.status).toBe('REJECTED');
      const prisma = app.get(PrismaService);
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(booking.depositStatus).toBe('RELEASED');
    });

    it('rejects reviewing an already-reviewed claim', async () => {
      const admin = await registerAdmin(app);
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      const created = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(201);
      const claimId = created.body.data.id as string;
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/deposit-claims/${claimId}`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'REJECTED' })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/deposit-claims/${claimId}`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'APPROVED' })
        .expect(400);
    });
  });

  describe('release cron with pending claim', () => {
    it('does not release a deposit while a claim is pending', async () => {
      const admin = await registerAdmin(app);
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createDepositBooking(app, host, guest);
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/deposit-claim`)
        .set(authHeader(host.accessToken))
        .send(validClaim())
        .expect(201);
      const prisma = app.get(PrismaService);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { checkOut: new Date(Date.now() - 5 * DAY_MS) },
      });
      await request(app.getHttpServer())
        .post('/api/v1/admin/cron/release-expired-deposit-holds')
        .set(authHeader(admin.accessToken))
        .expect(201);
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(booking.depositStatus).toBe('AUTHORIZED');
    });
  });
});
