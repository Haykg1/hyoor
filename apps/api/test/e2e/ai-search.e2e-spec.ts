import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { addUtcDays, todayIsoUtc } from '@repo/shared';
import request from 'supertest';

import { LlmService } from '../../src/ai-search/llm/llm.service';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { AI_SEARCH_THROTTLE } from '../../src/common/throttle/throttle.constants';
import { PrismaService } from '../../src/database/prisma.service';
import { PropertiesService } from '../../src/properties/properties.service';
import { RedisService } from '../../src/redis/redis.service';
import { StorageService } from '../../src/storage/storage.service';
import { MockRedisService } from '../helpers/mock-redis.service';
import { MockStorageService } from '../helpers/mock-storage.service';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser } from '../helpers/test-data.helper';

describe('AI search (e2e)', () => {
  let app: INestApplication;
  let redis: MockRedisService;

  const mockUsage = { promptTokens: 900, completionTokens: 120, totalTokens: 1020 };

  const mockLlm = {
    complete: jest.fn(),
    completeHostCalendar: jest.fn(),
    generateHostCalendarSuggestions: jest.fn(),
  };

  const mockPropertiesSearch = jest.fn();

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
      .overrideProvider(PropertiesService)
      .useValue({ search: mockPropertiesSearch })
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a clarification response without searching', async () => {
    mockLlm.complete.mockResolvedValue({
      kind: 'clarify',
      message: 'Where would you like to stay?',
      usage: mockUsage,
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({ messages: [{ role: 'user', content: 'I need a place' }] })
      .expect(201);
    expect(response.body.data.type).toBe('clarify');
    expect(response.body.data.message).toBe('Where would you like to stay?');
    expect(response.body.data.quota).toEqual(
      expect.objectContaining({
        limit: 5,
        used: 1,
        remaining: 4,
        isAuthenticated: false,
        tokenLimit: 12000,
        tokensUsed: 1020,
        tokensRemaining: 10980,
      }),
    );
    expect(mockLlm.complete).toHaveBeenCalledTimes(1);
  });

  it('returns guest quota status', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/ai-search/quota').expect(200);
    expect(response.body.data).toEqual({
      limit: 5,
      used: 0,
      remaining: 5,
      isAuthenticated: false,
      isVerifiedProfile: false,
      tokenLimit: 12000,
      tokensUsed: 0,
      tokensRemaining: 12000,
    });
  });

  it('returns verified member quota with limit 10', async () => {
    const user = await registerUser(app);
    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { id: user.userId },
      data: { isEmailVerified: true },
    });
    await prisma.userProfile.update({
      where: { userId: user.userId },
      data: { phone: '+37499123456' },
    });
    const response = await request(app.getHttpServer())
      .get('/api/v1/ai-search/quota')
      .set(authHeader(user.accessToken))
      .expect(200);
    expect(response.body.data).toEqual({
      limit: 10,
      used: 0,
      remaining: 10,
      isAuthenticated: true,
      isVerifiedProfile: true,
      tokenLimit: 28000,
      tokensUsed: 0,
      tokensRemaining: 28000,
    });
  });

  it('searches properties when the LLM calls the search tool', async () => {
    const today = todayIsoUtc();
    const pastCheckIn = addUtcDays(today, -20);
    const pastCheckOut = addUtcDays(today, -16);
    mockPropertiesSearch.mockResolvedValue({
      data: [
        {
          id: 'property-1',
          title: 'E2E Favorites Apartment',
          city: 'Yerevan',
          propertyType: 'APARTMENT',
          maxGuests: 2,
          pricePerNight: 25000,
        },
      ],
      total: 1,
      page: 1,
      limit: 8,
      totalPages: 1,
    });
    mockLlm.complete.mockResolvedValue({
      kind: 'tool',
      message: 'Here are some stays in Yerevan.',
      args: {
        locationQuery: 'Yerevan',
        checkIn: pastCheckIn,
        checkOut: pastCheckOut,
        maxGuests: 2,
      },
      usage: mockUsage,
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({
        messages: [
          {
            role: 'user',
            content: 'Apartment in Yerevan for 2 guests July 1-5 2026',
          },
        ],
        locale: 'en',
      })
      .expect(201);
    const data = response.body.data;
    expect(data.type).toBe('search');
    expect(data.message).toContain('Yerevan');
    expect(data.properties).toHaveLength(1);
    expect(data.properties[0].title).toBe('E2E Favorites Apartment');
    expect(data.filters.locationLabel).toMatch(/Yerevan/i);
    // Geo coords win over city text — searchCity is cleared when lat/lng are present.
    const hasGeo =
      data.filters.searchLatitude !== undefined && data.filters.searchLongitude !== undefined;
    expect(hasGeo || data.filters.searchCity === 'Yerevan').toBe(true);
    if (hasGeo) {
      expect(data.filters.searchCity).toBeUndefined();
    }
    expect(data.searchPath).toContain('/search?');
    expect(data.searchPath).toContain(`checkIn=${today}`);
    expect(data.searchPath).toContain(`checkOut=${addUtcDays(today, 4)}`);
    expect(mockPropertiesSearch).toHaveBeenCalledTimes(1);
  });

  it('searches with flexible July dates and returns suggested stay per property', async () => {
    const today = todayIsoUtc();
    const pastFrom = addUtcDays(today, -14);
    const windowEnd = addUtcDays(today, 20);
    const suggestedCheckIn = addUtcDays(today, -11);
    const suggestedCheckOut = addUtcDays(today, -6);
    mockPropertiesSearch.mockResolvedValue({
      data: [
        {
          id: 'property-dilijan',
          title: 'Forest Cottage Dilijan',
          slug: 'forest-cottage-dilijan',
          city: 'Dilijan',
          region: 'Tavush',
          country: 'AM',
          propertyType: 'HOUSE',
          maxGuests: 4,
          bedrooms: 2,
          pricePerNight: 22000,
          currency: 'AMD',
          reviewCount: 3,
          featured: false,
        },
      ],
      total: 1,
      page: 1,
      limit: 8,
      totalPages: 1,
      suggestedDatesByPropertyId: {
        'property-dilijan': {
          suggestedCheckIn,
          suggestedCheckOut,
        },
      },
    });
    mockLlm.complete.mockResolvedValue({
      kind: 'tool',
      message: 'Here are some stays in Dilijan for 5 nights in July.',
      args: {
        locationQuery: 'Dilijan',
        stayNights: 5,
        availableFrom: pastFrom,
        availableTo: windowEnd,
        maxPrice: 24000,
      },
      usage: mockUsage,
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({
        messages: [
          {
            role: 'user',
            content:
              'I want 5 nights somewhere in Dilijan area, budget $60/night, anytime in July.',
          },
        ],
        locale: 'en',
      })
      .expect(201);
    const data = response.body.data;
    expect(data.type).toBe('search');
    expect(data.filters.stayNights).toBe(5);
    expect(data.filters.availableFrom).toBe(today);
    expect(data.properties[0].suggestedCheckIn).toBe(suggestedCheckIn);
    expect(data.properties[0].suggestedCheckOut).toBe(suggestedCheckOut);
    expect(data.searchPath).toContain(`checkIn=${today}`);
    expect(mockPropertiesSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        stayNights: 5,
        availableFrom: today,
        availableTo: windowEnd,
        maxPrice: 24000,
      }),
    );
  });

  it('returns 429 when a guest exceeds the daily AI search limit', async () => {
    mockLlm.complete.mockResolvedValue({
      kind: 'clarify',
      message: 'Where would you like to stay?',
      usage: mockUsage,
    });
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/ai-search/chat')
        .send({ messages: [{ role: 'user', content: 'I need a place to stay in Yerevan' }] })
        .expect(201);
    }
    const blocked = await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({ messages: [{ role: 'user', content: 'Apartment in Yerevan for 2 guests' }] })
      .expect(429);
    expect(blocked.body.code).toBe('AI_SEARCH_GUEST_LIMIT');
    expect(blocked.body.success).toBe(false);
    expect(mockLlm.complete).toHaveBeenCalledTimes(5);
  });

  it('returns 400 when messages are empty', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({ messages: [] })
      .expect(400);
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it('returns 400 when a message exceeds max length', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({ messages: [{ role: 'user', content: 'x'.repeat(501) }] })
      .expect(400);
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it('rejects off-topic messages without calling the LLM or consuming quota', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({
        messages: [{ role: 'user', content: 'Write me a Python script to sort a list' }],
      })
      .expect(201);
    expect(response.body.data.type).toBe('clarify');
    expect(response.body.data.message).toContain('short-term rentals');
    expect(response.body.data.quota).toEqual(
      expect.objectContaining({ used: 0, remaining: 5, tokensUsed: 0 }),
    );
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it('rejects host calendar intents in guest chat', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({
        messages: [{ role: 'user', content: 'Close June 10 on my listing calendar' }],
      })
      .expect(201);
    expect(response.body.data.type).toBe('clarify');
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it('applies current-month date defaults when the tool omits timing', async () => {
    mockLlm.complete.mockResolvedValue({
      kind: 'tool',
      message: 'Searching now.',
      args: { locationQuery: 'Yerevan' },
      usage: mockUsage,
    });
    mockPropertiesSearch.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 8,
      totalPages: 1,
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-search/chat')
      .send({ messages: [{ role: 'user', content: 'Yerevan please' }] })
      .expect(201);
    expect(response.body.data.type).toBe('search');
    expect(response.body.data.filters.stayNights).toBe(1);
    expect(response.body.data.filters.availableFrom).toBeDefined();
    expect(response.body.data.filters.availableTo).toBeDefined();
    expect(mockPropertiesSearch).toHaveBeenCalledTimes(1);
  });

  it('defaults AI search rate limit to 20 requests per window', () => {
    expect(AI_SEARCH_THROTTLE.default.limit).toBe(20);
  });
});
