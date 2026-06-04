import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { createActiveHostProperty, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

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

describe('Admin (e2e)', () => {
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

  it('returns platform stats', async () => {
    const admin = await registerAdmin(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.users.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.properties).toBeDefined();
    expect(response.body.data.bookings).toBeDefined();
    expect(response.body.data.reviews).toBeDefined();
  });

  it('lists all users with pagination', async () => {
    const admin = await registerAdmin(app);
    await registerUser(app, { email: uniqueEmail('guest') });
    await registerUser(app, { email: uniqueEmail('guest2') });
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.total).toBeGreaterThanOrEqual(3);
    expect(response.body.data.data[0]).not.toHaveProperty('passwordHash');
  });

  it('filters users by role', async () => {
    const admin = await registerAdmin(app);
    await registerHostUser(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .query({ role: 'HOST' })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.data.every((u: { role: string }) => u.role === 'HOST')).toBe(true);
  });

  it('returns detailed user view with booking count', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActiveHostProperty(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/users/${guest.userId}`)
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.bookingCount).toBe(1);
    expect(response.body.data.profile).toBeDefined();
  });

  it('activates and deactivates a user', async () => {
    const admin = await registerAdmin(app);
    const user = await registerUser(app, { email: uniqueEmail('target') });
    const deactivate = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${user.userId}/status`)
      .set(authHeader(admin.accessToken))
      .send({ isActive: false })
      .expect(200);
    expect(deactivate.body.data.isActive).toBe(false);
    const activate = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${user.userId}/status`)
      .set(authHeader(admin.accessToken))
      .send({ isActive: true })
      .expect(200);
    expect(activate.body.data.isActive).toBe(true);
  });

  it('changes user role (ADMIN only)', async () => {
    const admin = await registerAdmin(app);
    const user = await registerUser(app, { email: uniqueEmail('target') });
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${user.userId}/role`)
      .set(authHeader(admin.accessToken))
      .send({ role: 'STAFF' })
      .expect(200);
    expect(response.body.data.role).toBe('STAFF');
  });

  it('lists all properties regardless of status', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    await createActiveHostProperty(app, host);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/properties')
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.stats).toBeDefined();
    expect(response.body.data.stats.totalListings).toBeGreaterThanOrEqual(1);
  });

  it('returns admin dashboard stats', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    await createActiveHostProperty(app, host);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/stats')
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.totalListings).toBeGreaterThanOrEqual(1);
    expect(response.body.data.activeListings).toBeGreaterThanOrEqual(1);
  });

  it('changes property status', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const property = await createActiveHostProperty(app, host);
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/admin/properties/${property.id}/status`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'SUSPENDED' })
      .expect(200);
    expect(response.body.data.status).toBe('SUSPENDED');
  });

  it('lists bookings with status filter', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActiveHostProperty(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/bookings')
      .query({ status: 'PENDING' })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.data[0].status).toBe('PENDING');
  });

  it('rejects guest access to admin routes', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set(authHeader(guest.accessToken))
      .expect(403);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/stats').expect(401);
  });

  it('returns a bookings time-series for admin', async () => {
    const admin = await registerAdmin(app);
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActiveHostProperty(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/stats/timeseries')
      .query({ metric: 'bookings', range: 'day' })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(response.body.data.metric).toBe('bookings');
    expect(response.body.data.range).toBe('day');
    expect(Array.isArray(response.body.data.data)).toBe(true);
    const total = (response.body.data.data as Array<{ value: number }>).reduce(
      (sum, row) => sum + row.value,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it('rejects timeseries with invalid metric', async () => {
    const admin = await registerAdmin(app);
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats/timeseries')
      .query({ metric: 'unknown' })
      .set(authHeader(admin.accessToken))
      .expect(400);
  });
});
