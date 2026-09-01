import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { addUtcDays, todayIsoUtc } from '@repo/shared';
import request from 'supertest';

import { LlmService } from '../../src/ai-search/llm/llm.service';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/database/prisma.service';
import { GeocodingService } from '../../src/geocoding/geocoding.service';
import { RedisService } from '../../src/redis/redis.service';
import { StorageService } from '../../src/storage/storage.service';
import { yerevanDateKey } from '../../src/trip-planner/trip-planner.constants';
import { MockGeocodingService } from '../helpers/mock-geocoding.service';
import { MockRedisService } from '../helpers/mock-redis.service';
import { MockStorageService } from '../helpers/mock-storage.service';
import { seedPlannerPois } from '../helpers/poi-test.helper';
import { createActivePropertyDirect, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

function utcDay(offsetDays: number): string {
  return addUtcDays(todayIsoUtc(), offsetDays);
}

const ANSWERS = {
  pace: 'balanced',
  alcohol: 'wine',
  era: 'mix',
  focus: 'adventure',
};

function generatedPlanJson(): unknown {
  return {
    summary: 'A balanced two-day Yerevan plan.',
    days: [
      {
        theme: 'Old city & museums',
        picks: [
          {
            poiId: 'tp-matenadaran',
            startTime: '09:30',
            endTime: '11:00',
            whyThisFits: 'Matches the historical focus.',
          },
          {
            poiId: 'tp-tavern-yerevan',
            startTime: '13:00',
            endTime: '14:30',
            whyThisFits: 'Mid-budget Armenian lunch.',
          },
        ],
      },
      {
        theme: 'Views & food',
        picks: [
          {
            poiId: 'tp-cascade',
            startTime: '10:00',
            endTime: '11:30',
            whyThisFits: 'Iconic Yerevan views.',
          },
          {
            poiId: 'tp-lavash-restaurant',
            startTime: '13:00',
            endTime: '14:30',
            whyThisFits: 'Local cuisine on the mid band.',
          },
        ],
      },
    ],
  };
}

async function waitUntilReady(
  app: INestApplication,
  token: string,
  planId: string,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/trip-planner/${planId}`)
      .set(authHeader(token))
      .expect(200);
    const status = response.body.data.status as string;
    if (status === 'READY' || status === 'FAILED')
      return response.body.data as Record<string, unknown>;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Trip plan did not finish generating');
}

describe('Trip planner (e2e)', () => {
  let app: INestApplication;
  let redis: MockRedisService;
  const mockUsage = { promptTokens: 100, completionTokens: 40, totalTokens: 140 };
  const mockLlm = {
    complete: jest.fn(),
    completeHostCalendar: jest.fn(),
    completeGeneratedTripPlan: jest.fn(),
    generateHostCalendarSuggestions: jest.fn(),
    normalizeBulkPropertyRows: jest.fn(),
  };

  beforeAll(async () => {
    redis = new MockRedisService();
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(new MockStorageService())
      .overrideProvider(RedisService)
      .useValue(redis)
      .overrideProvider(GeocodingService)
      .useClass(MockGeocodingService)
      .overrideProvider(LlmService)
      .useValue(mockLlm)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    redis.clearKv();
    const prisma = app.get(PrismaService);
    await resetE2eDatabase(prisma);
    await seedPlannerPois(prisma);
    mockLlm.completeGeneratedTripPlan.mockImplementation(async () => ({
      json: generatedPlanJson(),
      usage: mockUsage,
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  function startPlan(token: string, body: Record<string, unknown>): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/trip-planner')
      .set(authHeader(token))
      .send({
        city: 'Yerevan',
        region: 'Yerevan',
        checkIn: utcDay(10),
        checkOut: utcDay(12),
        locale: 'en',
        preferences: ANSWERS,
        guestCount: 2,
        ...body,
      });
  }

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/v1/trip-planner').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/trip-planner')
      .send({ city: 'Yerevan', checkIn: utcDay(10), checkOut: utcDay(12), preferences: ANSWERS })
      .expect(401);
  });

  it('rejects incomplete intake', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('planner-intake') });
    await startPlan(guest.accessToken, { preferences: { pace: 'balanced' } }).expect(400);
  });

  it('rejects ranges longer than 10 days', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('planner-long') });
    await startPlan(guest.accessToken, { checkOut: utcDay(21) }).expect(400);
  });

  it('creates and generates a catalog-backed itinerary in one call', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const guest = await registerUser(app, { email: uniqueEmail('planner') });
    const created = await startPlan(guest.accessToken, {}).expect(201);
    expect(created.body.data.plan.status).toBe('GENERATING');
    expect(created.body.data.quota.remaining).toBe(3);
    const planId = created.body.data.plan.id as string;
    const ready = await waitUntilReady(app, guest.accessToken, planId);
    expect(ready.status).toBe('READY');
    const days = ready.days as {
      estimatedCostAmd: number | null;
      items: {
        placeId: string | null;
        kind: string;
        verificationStatus: string;
        verifiedAt: string | null;
        walkToNextMinutes: number | null;
      }[];
    }[];
    expect(days).toHaveLength(2);
    for (const day of days) {
      expect(day.items.length).toBeGreaterThanOrEqual(2);
      expect(day.items.every((item) => item.placeId)).toBe(true);
      expect(day.items.some((item) => item.kind === 'meal')).toBe(true);
    }
    expect(days[0]?.items.some((item) => item.placeId === 'tp-matenadaran')).toBe(true);
    expect(days[0]?.items[0]?.verificationStatus).toBe('verified');
    expect(days[0]?.items[0]?.verifiedAt).toBeTruthy();
    expect(days[0]?.items[0]?.walkToNextMinutes).toBeGreaterThan(0);
    expect(days[0]?.estimatedCostAmd).toBeGreaterThan(0);
    expect(mockLlm.completeGeneratedTripPlan).toHaveBeenCalledTimes(1);
    const firecrawlCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes('firecrawl'));
    expect(firecrawlCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it('does not persist anything for an unsupported city', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('planner-city') });
    const response = await startPlan(guest.accessToken, {
      city: 'Batumi',
      region: undefined,
    }).expect(400);
    expect(response.body.code).toBe('TRIP_PLANNER_CITY_UNSUPPORTED');
    const list = await request(app.getHttpServer())
      .get('/api/v1/trip-planner')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(list.body.data).toHaveLength(0);
  });

  it('creates a plan linked to a booking with a stay snapshot', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('planner-book') });
    const property = await createActivePropertyDirect(app, host);
    const booking = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({ propertyId: property.id, checkIn: utcDay(14), checkOut: utcDay(16), guestCount: 2 })
      .expect(201);
    const bookingId = booking.body.data.id as string;
    const created = await request(app.getHttpServer())
      .post('/api/v1/trip-planner')
      .set(authHeader(guest.accessToken))
      .send({ bookingId, locale: 'en', preferences: ANSWERS })
      .expect(201);
    expect(created.body.data.plan.bookingId).toBe(bookingId);
    expect(created.body.data.plan.city).toBe('Yerevan');
    expect(created.body.data.plan.stay).toBeTruthy();
  });

  it('lets a guest delete a trip plan', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('planner-del') });
    const created = await startPlan(guest.accessToken, {}).expect(201);
    const planId = created.body.data.plan.id as string;
    await waitUntilReady(app, guest.accessToken, planId);
    await request(app.getHttpServer())
      .delete(`/api/v1/trip-planner/${planId}`)
      .set(authHeader(guest.accessToken))
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/trip-planner/${planId}`)
      .set(authHeader(guest.accessToken))
      .expect(404);
  });

  it('returns 429 when the daily trip planner limit is reached', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('planner-limit') });
    await redis.incrByWithTtl(`trip-planner:quota:${guest.userId}:${yerevanDateKey()}`, 16, 86400);
    const blocked = await startPlan(guest.accessToken, {}).expect(429);
    expect(blocked.body.code).toBe('TRIP_PLANNER_LIMIT');
    const list = await request(app.getHttpServer())
      .get('/api/v1/trip-planner')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(list.body.data).toHaveLength(0);
  });
});
