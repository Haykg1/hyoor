import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { LlmService } from '../../src/ai-search/llm/llm.service';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { StorageService } from '../../src/storage/storage.service';
import { MockRedisService } from '../helpers/mock-redis.service';
import { MockStorageService } from '../helpers/mock-storage.service';
import {
  createActivePropertyDirect,
  registerHostUser,
  type RegisteredHostUser,
} from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader } from '../helpers/test-data.helper';
import { registerUser, uniqueEmail } from '../helpers/test-data.helper';

describe('Host calendar AI (e2e)', () => {
  let app: INestApplication;
  let redis: MockRedisService;
  let host: RegisteredHostUser;
  let propertyId: string;

  const mockUsage = { promptTokens: 800, completionTokens: 100, totalTokens: 900 };

  const mockLlm = {
    complete: jest.fn(),
    completeHostCalendar: jest.fn(),
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
    host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    propertyId = property.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns host calendar quota', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ai-search/host-calendar/quota')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        limit: 20,
        used: 0,
        remaining: 20,
        tokenLimit: 40000,
      }),
    );
  });

  it('returns calendar preview when LLM proposes changes', async () => {
    mockLlm.completeHostCalendar.mockResolvedValue({
      kind: 'calendar_proposal',
      message: 'I will close June 10–12.',
      args: { dateFrom: '2026-06-10', dateTo: '2026-06-12', isAvailable: false },
      usage: mockUsage,
    });
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/chat`)
      .set(authHeader(host.accessToken))
      .send({ messages: [{ role: 'user', content: 'Close June 10-12' }] })
      .expect(201);
    expect(response.body.data.type).toBe('calendar_preview');
    expect(response.body.data.proposedChanges.entries.length).toBe(3);
    expect(mockLlm.completeHostCalendar).toHaveBeenCalledTimes(1);
  });

  it('returns already_applied when dates already match', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/availability/${propertyId}`)
      .set(authHeader(host.accessToken))
      .send({
        entries: [
          { date: '2026-06-10', isAvailable: false },
          { date: '2026-06-11', isAvailable: false },
        ],
      })
      .expect(200);
    mockLlm.completeHostCalendar.mockResolvedValue({
      kind: 'calendar_proposal',
      message: 'Closing those dates.',
      args: { dateFrom: '2026-06-10', dateTo: '2026-06-11', isAvailable: false },
      usage: mockUsage,
    });
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/chat`)
      .set(authHeader(host.accessToken))
      .send({ messages: [{ role: 'user', content: 'Close June 10-11' }] })
      .expect(201);
    expect(response.body.data.type).toBe('already_applied');
  });

  it('confirms and applies calendar changes with revert hint', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/confirm`)
      .set(authHeader(host.accessToken))
      .send({
        entries: [
          { date: '2026-06-20', isAvailable: false },
          { date: '2026-06-21', isAvailable: false },
        ],
      })
      .expect(201);
    expect(response.body.data.type).toBe('calendar_applied');
    expect(response.body.data.revertHint).toContain('revert');
    expect(response.body.data.appliedSummary.appliedCount).toBe(2);
    const range = await request(app.getHttpServer())
      .get(`/api/v1/availability/${propertyId}`)
      .query({ from: '2026-06-20', to: '2026-06-21' })
      .expect(200);
    expect(range.body.data.entries[0].isAvailable).toBe(false);
  });

  it('rejects off-topic host messages without calling LLM', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/chat`)
      .set(authHeader(host.accessToken))
      .send({
        messages: [{ role: 'user', content: 'Write me a Python script' }],
      })
      .expect(201);
    expect(response.body.data.type).toBe('clarify');
    expect(response.body.data.quota.used).toBe(0);
    expect(mockLlm.completeHostCalendar).not.toHaveBeenCalled();
  });

  it('rejects other-property requests without calling LLM', async () => {
    const prisma = app.get(PrismaService);
    await prisma.property.create({
      data: {
        hostId: host.hostProfileId,
        title: 'Gyumri Cottage',
        slug: `gyumri-${Date.now()}`,
        description: 'Other listing',
        propertyType: 'HOUSE',
        city: 'Gyumri',
        country: 'AM',
        maxGuests: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 1,
        pricePerNight: 30000,
        currency: 'AMD',
        cancellationPolicy: 'MODERATE',
        status: 'ACTIVE',
      },
    });
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/chat`)
      .set(authHeader(host.accessToken))
      .send({
        messages: [{ role: 'user', content: 'Also close dates on my Gyumri Cottage' }],
      })
      .expect(201);
    expect(response.body.data.message).toContain('only change');
    expect(mockLlm.completeHostCalendar).not.toHaveBeenCalled();
  });

  it('returns 403 for non-host users', async () => {
    const guest = await registerUser(app);
    await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/chat`)
      .set(authHeader(guest.accessToken))
      .send({ messages: [{ role: 'user', content: 'Close June 10' }] })
      .expect(403);
  });

  it('returns 403 when host does not own the property', async () => {
    const otherHost = await registerHostUser(app);
    await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/chat`)
      .set(authHeader(otherHost.accessToken))
      .send({ messages: [{ role: 'user', content: 'Close June 10' }] })
      .expect(403);
  });

  it('skips booked dates on confirm and applies the rest', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId,
        checkIn: '2026-07-10',
        checkOut: '2026-07-13',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai-search/host-calendar/${propertyId}/confirm`)
      .set(authHeader(host.accessToken))
      .send({
        entries: [
          { date: '2026-07-09', isAvailable: false },
          { date: '2026-07-10', isAvailable: false },
          { date: '2026-07-11', isAvailable: false },
          { date: '2026-07-12', isAvailable: false },
        ],
      })
      .expect(201);
    expect(response.body.data.type).toBe('calendar_applied');
    expect(response.body.data.appliedSummary.appliedCount).toBe(1);
    expect(response.body.data.appliedSummary.skippedBookedCount).toBe(3);
    const range = await request(app.getHttpServer())
      .get(`/api/v1/availability/${propertyId}`)
      .query({ from: '2026-07-09', to: '2026-07-12' })
      .expect(200);
    const byDate = Object.fromEntries(
      range.body.data.entries.map(
        (e: { date: string; isAvailable: boolean; isBlockedByBooking: boolean }) => [e.date, e],
      ),
    );
    expect(byDate['2026-07-09'].isAvailable).toBe(false);
    expect(byDate['2026-07-10'].isBlockedByBooking).toBe(true);
    expect(byDate['2026-07-11'].isBlockedByBooking).toBe(true);
    expect(byDate['2026-07-12'].isBlockedByBooking).toBe(true);
  });
});
