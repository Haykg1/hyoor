import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { createActivePropertyDirect, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

describe('Bookings (e2e)', () => {
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

  it('creates a CONFIRMED booking as guest', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
        specialRequests: 'Late check-in please',
      })
      .expect(201);
    expect(response.body.data.status).toBe('CONFIRMED');
    expect(response.body.data.nightsCount).toBe(3);
    expect(response.body.data.conversationId).toBeTruthy();
    expect(response.body.data.property.id).toBe(property.id);
  });

  it('blocks dates on calendar when booking is created', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    expect(create.body.data.status).toBe('CONFIRMED');
    const blocked = await request(app.getHttpServer())
      .get(`/api/v1/availability/${property.id}/blocked`)
      .query({ from: '2025-07-01', to: '2025-07-31' })
      .expect(200);
    expect(blocked.body.data.dates).toEqual(['2025-07-10', '2025-07-11', '2025-07-12']);
  });

  it('cancels confirmed booking and unblocks dates', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-08-01',
        checkOut: '2025-08-04',
        guestCount: 2,
      })
      .expect(201);
    const bookingId = create.body.data.id as string;
    expect(create.body.data.status).toBe('CONFIRMED');
    const cancel = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set(authHeader(guest.accessToken))
      .send({ reason: 'Plans changed' })
      .expect(200);
    expect(cancel.body.data.status).toBe('CANCELLED_BY_GUEST');
    const blocked = await request(app.getHttpServer())
      .get(`/api/v1/availability/${property.id}/blocked`)
      .query({ from: '2025-08-01', to: '2025-08-10' })
      .expect(200);
    expect(blocked.body.data.dates).toEqual([]);
  });

  it('rejects booking on inactive property', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const prisma = app.get(PrismaService);
    await prisma.property.update({
      where: { id: property.id },
      data: { status: 'DRAFT' },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects overlapping confirmed bookings', async () => {
    const host = await registerHostUser(app);
    const guestA = await registerUser(app, { email: uniqueEmail('guest-a') });
    const guestB = await registerUser(app, { email: uniqueEmail('guest-b') });
    const property = await createActivePropertyDirect(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guestA.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-09-01',
        checkOut: '2025-09-04',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guestB.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-09-02',
        checkOut: '2025-09-05',
        guestCount: 2,
      })
      .expect(409);
    expect(response.body.success).toBe(false);
  });

  it('allows guest to attach payment reference', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-10-01',
        checkOut: '2025-10-03',
        guestCount: 1,
      })
      .expect(201);
    const bookingId = create.body.data.id as string;
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/payment-ref`)
      .set(authHeader(guest.accessToken))
      .send({ externalPaymentRef: 'BANK-TRX-123' })
      .expect(200);
    expect(response.body.data.externalPaymentRef).toBe('BANK-TRX-123');
  });

  it('lists bookings for admin and my bookings for host/guest', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-11-01',
        checkOut: '2025-11-03',
        guestCount: 2,
      })
      .expect(201);
    const guestBookings = await request(app.getHttpServer())
      .get('/api/v1/bookings/my')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(guestBookings.body.data.data).toHaveLength(1);
    const hostBookings = await request(app.getHttpServer())
      .get('/api/v1/bookings/my')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(hostBookings.body.data.data).toHaveLength(1);
    const admin = await registerUser(app, { email: uniqueEmail('admin') });
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    const allBookings = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set(authHeader(adminLogin.body.data.accessToken))
      .expect(200);
    expect(allBookings.body.data.total).toBe(1);
  });

  it('initiates a CASH checkout and marks booking as PENDING payment', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-12-01',
        checkOut: '2025-12-03',
        guestCount: 2,
      })
      .expect(201);
    const bookingId = create.body.data.id as string;
    const response = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/checkout`)
      .set(authHeader(guest.accessToken))
      .send({ provider: 'CASH' })
      .expect(200);
    expect(response.body.data.provider).toBe('CASH');
    expect(response.body.data.status).toBe('PENDING');
    expect(response.body.data.externalRef).toEqual(expect.any(String));
    const prisma = app.get(PrismaService);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.paymentStatus).toBe('PENDING');
    expect(booking?.paymentProvider).toBe('CASH');
  });

  it('returns 501 NotImplemented for IDRAM checkout', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-12-10',
        checkOut: '2025-12-12',
        guestCount: 1,
      })
      .expect(201);
    const bookingId = create.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/checkout`)
      .set(authHeader(guest.accessToken))
      .send({ provider: 'IDRAM' })
      .expect(501);
  });

  it('marks booking PAID via webhook after CASH checkout', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2026-01-01',
        checkOut: '2026-01-03',
        guestCount: 1,
      })
      .expect(201);
    const bookingId = create.body.data.id as string;
    const checkout = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/checkout`)
      .set(authHeader(guest.accessToken))
      .send({ provider: 'CASH' })
      .expect(200);
    const externalRef = checkout.body.data.externalRef as string;
    const prisma = app.get(PrismaService);
    await prisma.booking.update({
      where: { id: bookingId },
      data: { externalPaymentRef: externalRef },
    });
    await request(app.getHttpServer())
      .post('/api/v1/bookings/webhooks/cash')
      .send({ externalRef })
      .expect(200);
    const updated = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(updated?.paymentStatus).toBe('PAID');
    expect(updated?.status).toBe('CONFIRMED');
  });

  it('quotes and applies a date-range promotion to a booking', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const promo = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 20,
        description: 'Summer deal: 20% off eligible stays in July.',
        bookingStartDate: '2026-07-01',
        bookingEndDate: '2026-07-31',
        maxApplications: 5,
        notifyGuests: false,
      })
      .expect(201);
    const promotionId = promo.body.data.promotion.id as string;
    const quote = await request(app.getHttpServer())
      .get('/api/v1/bookings/quote')
      .query({
        propertyId: property.id,
        checkIn: '2026-07-10',
        checkOut: '2026-07-13',
      })
      .expect(200);
    expect(quote.body.data.accommodationSubtotal).toBe(75000);
    expect(quote.body.data.discountAmount).toBe(15000);
    expect(quote.body.data.appliedPromotion.id).toBe(promotionId);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2026-07-10',
        checkOut: '2026-07-13',
        guestCount: 2,
      })
      .expect(201);
    expect(create.body.data.discountAmount).toBe(15000);
    expect(create.body.data.promotionId).toBe(promotionId);
    expect(create.body.data.totalAmount).toBe(60000);
    const prisma = app.get(PrismaService);
    const promotion = await prisma.propertyPromotion.findUnique({ where: { id: promotionId } });
    expect(promotion?.appliedCount).toBe(1);
  });

  it('returns promo code error in quote for invalid code', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const quote = await request(app.getHttpServer())
      .get('/api/v1/bookings/quote')
      .query({
        propertyId: property.id,
        checkIn: '2026-07-10',
        checkOut: '2026-07-13',
        promoCode: 'NOTREAL',
      })
      .expect(200);
    expect(quote.body.data.promoCodeError).toBe('Invalid or expired promo code');
    expect(quote.body.data.discountAmount).toBe(0);
  });

  it('applies the best discount between date-range and promo code', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 10,
        description: 'Small date-range deal for best-discount comparison test.',
        bookingStartDate: '2026-07-01',
        bookingEndDate: '2026-07-31',
        maxApplications: 5,
        notifyGuests: false,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'PROMO_CODE',
        discountType: 'PERCENT',
        discountPercent: 25,
        description: 'Better promo code for best-discount comparison test.',
        bookingStartDate: '2026-07-01',
        bookingEndDate: '2026-07-31',
        promoCode: 'BEST25',
        maxApplications: 5,
        notifyGuests: false,
      })
      .expect(201);
    const quote = await request(app.getHttpServer())
      .get('/api/v1/bookings/quote')
      .query({
        propertyId: property.id,
        checkIn: '2026-07-10',
        checkOut: '2026-07-13',
        promoCode: 'BEST25',
      })
      .expect(200);
    expect(quote.body.data.discountAmount).toBe(18750);
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2026-07-10',
        checkOut: '2026-07-13',
        guestCount: 2,
        promoCode: 'BEST25',
      })
      .expect(201);
    expect(create.body.data.discountAmount).toBe(18750);
  });

  it('increments appliedCount on create and decrements on cancel', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const promo = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'DATE_RANGE',
        discountType: 'PERCENT',
        discountPercent: 15,
        description: 'Create and cancel flow test promotion.',
        bookingStartDate: '2026-08-01',
        bookingEndDate: '2026-08-31',
        maxApplications: 3,
        notifyGuests: false,
      })
      .expect(201);
    const promotionId = promo.body.data.promotion.id as string;
    const create = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2026-08-05',
        checkOut: '2026-08-08',
        guestCount: 2,
      })
      .expect(201);
    const bookingId = create.body.data.id as string;
    const prisma = app.get(PrismaService);
    let promotion = await prisma.propertyPromotion.findUnique({ where: { id: promotionId } });
    expect(promotion?.appliedCount).toBe(1);
    await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set(authHeader(guest.accessToken))
      .send({ reason: 'Plans changed' })
      .expect(200);
    promotion = await prisma.propertyPromotion.findUnique({ where: { id: promotionId } });
    expect(promotion?.appliedCount).toBe(0);
  });

  it('rejects create with exhausted promo code', async () => {
    const host = await registerHostUser(app);
    const guestA = await registerUser(app, { email: uniqueEmail('guest-a') });
    const guestB = await registerUser(app, { email: uniqueEmail('guest-b') });
    const property = await createActivePropertyDirect(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(authHeader(host.accessToken))
      .send({
        propertyId: property.id,
        type: 'PROMO_CODE',
        discountType: 'FIXED_AMOUNT',
        discountAmount: 5000,
        description: 'Single-slot promo code for create conflict test.',
        bookingStartDate: '2026-09-01',
        bookingEndDate: '2026-09-30',
        promoCode: 'ONCELOT',
        maxApplications: 1,
        notifyGuests: false,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guestA.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2026-09-05',
        checkOut: '2026-09-08',
        guestCount: 2,
        promoCode: 'ONCELOT',
      })
      .expect(201);
    const createB = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guestB.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2026-09-10',
        checkOut: '2026-09-13',
        guestCount: 2,
        promoCode: 'ONCELOT',
      })
      .expect(400);
    expect(createB.body.success).toBe(false);
  });

  it('confirms legacy PENDING booking via PATCH confirm', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const prisma = app.get(PrismaService);
    const booking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        guestId: guest.userId,
        checkIn: new Date('2026-10-01'),
        checkOut: new Date('2026-10-04'),
        guestCount: 2,
        nightsCount: 3,
        currency: 'AMD',
        nightlyRate: 25000,
        cleaningFee: 0,
        securityDeposit: 0,
        totalAmount: 75000,
        discountAmount: 0,
        status: 'PENDING',
      },
    });
    const confirm = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/confirm`)
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(confirm.body.data.status).toBe('CONFIRMED');
  });
});
