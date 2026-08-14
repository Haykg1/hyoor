import type { INestApplication } from '@nestjs/common';
import { addUtcDays, todayIsoUtc } from '@repo/shared';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { createHostProperty, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

function utcDay(offsetDays: number): string {
  return addUtcDays(todayIsoUtc(), offsetDays);
}

describe('Availability (e2e)', () => {
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

  it('returns availability rows for a date range', async () => {
    const host = await registerHostUser(app);
    const property = await createHostProperty(app, host);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/availability/${property.id}`)
      .query({ from: '2025-06-01', to: '2025-06-05' })
      .expect(200);
    expect(response.body.data.propertyId).toBe(property.id);
    expect(response.body.data.basePricePerNight).toBe(25000);
    expect(response.body.data.entries).toEqual([
      {
        date: '2025-06-01',
        isAvailable: true,
        isBlockedByBooking: false,
        priceOverride: null,
        effectivePricePerNight: 25000,
      },
      {
        date: '2025-06-02',
        isAvailable: true,
        isBlockedByBooking: false,
        priceOverride: null,
        effectivePricePerNight: 25000,
      },
      {
        date: '2025-06-03',
        isAvailable: true,
        isBlockedByBooking: false,
        priceOverride: null,
        effectivePricePerNight: 25000,
      },
      {
        date: '2025-06-04',
        isAvailable: true,
        isBlockedByBooking: false,
        priceOverride: null,
        effectivePricePerNight: 25000,
      },
      {
        date: '2025-06-05',
        isAvailable: true,
        isBlockedByBooking: false,
        priceOverride: null,
        effectivePricePerNight: 25000,
      },
    ]);
  });

  it('bulk upserts availability as property owner', async () => {
    const host = await registerHostUser(app);
    const property = await createHostProperty(app, host);
    const closed = utcDay(10);
    const priced = utcDay(11);
    const response = await request(app.getHttpServer())
      .put(`/api/v1/availability/${property.id}`)
      .set(authHeader(host.accessToken))
      .send({
        entries: [
          { date: closed, isAvailable: false },
          { date: priced, isAvailable: true, priceOverride: 30000 },
        ],
      })
      .expect(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      date: closed,
      isAvailable: false,
      effectivePricePerNight: 25000,
    });
    expect(response.body.data[1]).toMatchObject({
      date: priced,
      isAvailable: true,
      priceOverride: 30000,
      effectivePricePerNight: 30000,
    });
  });

  it('returns blocked dates from manual blocks and bookings', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createHostProperty(app, host);
    const blocked = utcDay(15);
    const stayStart = utcDay(20);
    const stayEnd = utcDay(23);
    await request(app.getHttpServer())
      .put(`/api/v1/availability/${property.id}`)
      .set(authHeader(host.accessToken))
      .send({ entries: [{ date: blocked, isAvailable: false }] })
      .expect(200);
    const prisma = app.get(PrismaService);
    await prisma.booking.create({
      data: {
        propertyId: property.id,
        guestId: guest.userId,
        status: 'CONFIRMED',
        checkIn: new Date(`${stayStart}T00:00:00.000Z`),
        checkOut: new Date(`${stayEnd}T00:00:00.000Z`),
        guestCount: 2,
        currency: 'AMD',
        nightlyRate: 25000,
        nightsCount: 3,
        totalAmount: 75000,
      },
    });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/availability/${property.id}/blocked`)
      .query({ from: utcDay(0), to: utcDay(30) })
      .expect(200);
    expect(response.body.data.dates).toEqual([blocked, stayStart, utcDay(21), utcDay(22)]);
  });

  it('rejects bulk upsert from non-owner host', async () => {
    const owner = await registerHostUser(app);
    const otherHost = await registerHostUser(app);
    const property = await createHostProperty(app, owner);
    const response = await request(app.getHttpServer())
      .put(`/api/v1/availability/${property.id}`)
      .set(authHeader(otherHost.accessToken))
      .send({ entries: [{ date: utcDay(10), isAvailable: false }] })
      .expect(403);
    expect(response.body.success).toBe(false);
  });

  it('requires authentication for bulk upsert', async () => {
    const host = await registerHostUser(app);
    const property = await createHostProperty(app, host);
    await request(app.getHttpServer())
      .put(`/api/v1/availability/${property.id}`)
      .send({ entries: [{ date: utcDay(10), isAvailable: false }] })
      .expect(401);
  });

  it('returns 404 for unknown property', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/availability/non-existent-id')
      .query({ from: '2025-06-01', to: '2025-06-05' })
      .expect(404);
  });
});
