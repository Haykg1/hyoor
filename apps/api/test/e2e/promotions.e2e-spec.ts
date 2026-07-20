import type { INestApplication } from '@nestjs/common';
import { addUtcDays, maxEditableIsoDate, todayIsoUtc } from '@repo/shared';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { createActivePropertyDirect, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

function validBookingWindow(): { start: string; end: string } {
  const start = todayIsoUtc();
  return { start, end: addUtcDays(start, 14) };
}

describe('Promotions (e2e)', () => {
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

  it('creates a date-range promotion and notifies favoriting guests', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const { start, end } = validBookingWindow();
    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${property.id}`)
      .set(authHeader(guest.accessToken))
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 20,
        description: 'Summer deal: 20% off stays booked in the next three days.',
        bookingStartDate: start,
        bookingEndDate: end,
        maxApplications: 3,
        notifyGuests: true,
      })
      .expect(201);
    expect(response.body.data.promotion.discountPercent).toBe(20);
    expect(response.body.data.guestsNotified).toBe(1);
    const guestNotifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(guestNotifications.body.data.total).toBe(1);
    expect(guestNotifications.body.data.data[0].type).toBe('PROPERTY_PROMOTION');
    expect(guestNotifications.body.data.data[0].title).toContain('Deal:');
  });

  it('creates a promo code promotion without notifying when disabled', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const { start, end } = validBookingWindow();
    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${property.id}`)
      .set(authHeader(guest.accessToken))
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'PROMO_CODE',
        discountType: 'FIXED_AMOUNT',
        discountAmount: 5000,
        description: 'Use code SAVE5K for 5000 AMD off your next booking in July.',
        bookingStartDate: start,
        bookingEndDate: end,
        promoCode: 'SAVE5K',
        maxApplications: 10,
        notifyGuests: false,
      })
      .expect(201);
    expect(response.body.data.promotion.promoCode).toBe('SAVE5K');
    expect(response.body.data.guestsNotified).toBe(0);
    const guestNotifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(guestNotifications.body.data.total).toBe(0);
  });

  it('lists promotions for the host', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const { start, end } = validBookingWindow();
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 15,
        description: 'Midweek special: 15% off Tuesday through Thursday stays.',
        bookingStartDate: start,
        bookingEndDate: end,
        maxApplications: 5,
        notifyGuests: false,
      })
      .expect(201);
    const list = await request(app.getHttpServer())
      .get('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.data[0].propertyId).toBe(property.id);
  });

  it('rejects promotion for a property the host does not own', async () => {
    const hostA = await registerHostUser(app);
    const hostB = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, hostA);
    const { start, end } = validBookingWindow();
    const response = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(hostB.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 10,
        description: 'Unauthorized attempt to add a promotion on another host listing.',
        bookingStartDate: start,
        bookingEndDate: end,
        maxApplications: 1,
        notifyGuests: false,
      })
      .expect(403);
    expect(response.body.success).toBe(false);
  });

  it('rejects booking dates in the past', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const pastStart = addUtcDays(todayIsoUtc(), -10);
    const pastEnd = addUtcDays(todayIsoUtc(), -3);
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 10,
        description: 'Past-dated promotion must be rejected by the API.',
        bookingStartDate: pastStart,
        bookingEndDate: pastEnd,
        maxApplications: 1,
        notifyGuests: false,
      })
      .expect(400);
  });

  it('rejects booking dates beyond today+365', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const today = todayIsoUtc();
    const beyond = addUtcDays(maxEditableIsoDate(today), 1);
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 10,
        description: 'Far-future promotion must be rejected by the API.',
        bookingStartDate: beyond,
        bookingEndDate: beyond,
        maxApplications: 1,
        notifyGuests: false,
      })
      .expect(400);
  });

  it('deletes a promotion owned by the host', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const { start, end } = validBookingWindow();
    const created = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 10,
        description: 'Promotion to be removed by the host from the dashboard.',
        bookingStartDate: start,
        bookingEndDate: end,
        maxApplications: 2,
        notifyGuests: false,
      })
      .expect(201);
    const promotionId = created.body.data.promotion.id as string;
    await request(app.getHttpServer())
      .delete(`/api/v1/promotions/${promotionId}`)
      .set(authHeader(host.accessToken))
      .expect(204);
    const list = await request(app.getHttpServer())
      .get('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(list.body.data.total).toBe(0);
  });

  it('returns 404 when deleting another host promotion', async () => {
    const hostA = await registerHostUser(app);
    const hostB = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, hostA);
    const { start, end } = validBookingWindow();
    const created = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(hostA.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 10,
        description: 'Host B must not be able to delete this promotion.',
        bookingStartDate: start,
        bookingEndDate: end,
        maxApplications: 1,
        notifyGuests: false,
      })
      .expect(201);
    const promotionId = created.body.data.promotion.id as string;
    await request(app.getHttpServer())
      .delete(`/api/v1/promotions/${promotionId}`)
      .set(authHeader(hostB.accessToken))
      .expect(404);
  });

  it('requires host role', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { start, end } = validBookingWindow();
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: 'any',
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 10,
        description: 'Guest should not be able to create host promotions.',
        bookingStartDate: start,
        bookingEndDate: end,
        maxApplications: 1,
        notifyGuests: false,
      })
      .expect(403);
  });
});
