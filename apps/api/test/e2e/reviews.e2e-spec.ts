import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';
import {
  createCompletedGuestBooking,
  createGuestBooking,
  registerHostUser,
} from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';

describe('Reviews (e2e)', () => {
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

  it('allows guest to review property after completed stay', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { bookingId, propertyId } = await createCompletedGuestBooking(app, host, guest);
    const response = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(guest.accessToken))
      .send({
        bookingId,
        target: 'PROPERTY',
        rating: 5,
        comment: 'Great stay!',
      })
      .expect(201);
    expect(response.body.data.target).toBe('PROPERTY');
    expect(response.body.data.propertyId).toBe(propertyId);
    expect(response.body.data.rating).toBe(5);
  });

  it('allows host to review guest after completed stay', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { bookingId } = await createCompletedGuestBooking(app, host, guest);
    const response = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(host.accessToken))
      .send({
        bookingId,
        target: 'GUEST',
        rating: 4,
        comment: 'Respectful guest',
      })
      .expect(201);
    expect(response.body.data.target).toBe('GUEST');
    expect(response.body.data.subjectId).toBe(guest.userId);
  });

  it('rejects duplicate reviews for the same booking direction', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { bookingId } = await createCompletedGuestBooking(app, host, guest);
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(guest.accessToken))
      .send({ bookingId, target: 'PROPERTY', rating: 5 })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(guest.accessToken))
      .send({ bookingId, target: 'PROPERTY', rating: 4 })
      .expect(409);
    expect(response.body.success).toBe(false);
  });

  it('rejects reviews for non-completed bookings', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { bookingId } = await createGuestBooking(app, host, guest);
    const response = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(guest.accessToken))
      .send({ bookingId, target: 'PROPERTY', rating: 5 })
      .expect(400);
    expect(response.body.success).toBe(false);
  });

  it('returns paginated property and guest reviews publicly', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { bookingId, propertyId } = await createCompletedGuestBooking(app, host, guest);
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(guest.accessToken))
      .send({ bookingId, target: 'PROPERTY', rating: 5, comment: 'Lovely place' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(host.accessToken))
      .send({ bookingId, target: 'GUEST', rating: 4, comment: 'Great guest' })
      .expect(201);
    const propertyReviews = await request(app.getHttpServer())
      .get(`/api/v1/reviews/property/${propertyId}`)
      .expect(200);
    expect(propertyReviews.body.data.total).toBe(1);
    expect(propertyReviews.body.data.data[0].comment).toBe('Lovely place');
    const guestReviews = await request(app.getHttpServer())
      .get(`/api/v1/reviews/user/${guest.userId}`)
      .expect(200);
    expect(guestReviews.body.data.total).toBe(1);
    expect(guestReviews.body.data.data[0].rating).toBe(4);
    const hostReviews = await request(app.getHttpServer())
      .get(`/api/v1/reviews/host/${host.hostProfileId}`)
      .expect(200);
    expect(hostReviews.body.data.total).toBe(1);
  });

  it('allows admin to unpublish a review', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { bookingId, propertyId } = await createCompletedGuestBooking(app, host, guest);
    const create = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(authHeader(guest.accessToken))
      .send({ bookingId, target: 'PROPERTY', rating: 3 })
      .expect(201);
    const reviewId = create.body.data.id as string;
    const admin = await registerUser(app, { email: uniqueEmail('admin') });
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    const unpublish = await request(app.getHttpServer())
      .patch(`/api/v1/reviews/${reviewId}`)
      .set(authHeader(adminLogin.body.data.accessToken))
      .expect(200);
    expect(unpublish.body.data.isPublished).toBe(false);
    const propertyReviews = await request(app.getHttpServer())
      .get(`/api/v1/reviews/property/${propertyId}`)
      .expect(200);
    expect(propertyReviews.body.data.total).toBe(0);
  });
});
