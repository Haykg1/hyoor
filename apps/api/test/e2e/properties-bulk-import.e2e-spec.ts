import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { LlmService } from '../../src/ai-search/llm/llm.service';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/database/prisma.service';
import { GeocodingService } from '../../src/geocoding/geocoding.service';
import { MailerService } from '../../src/mail/mailer.service';
import { RedisService } from '../../src/redis/redis.service';
import { StorageService } from '../../src/storage/storage.service';
import { MockRedisService } from '../helpers/mock-redis.service';
import { MockStorageService } from '../helpers/mock-storage.service';
import { registerHostUser, sampleProperty } from '../helpers/property-test.helper';
import type { RegisteredHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser } from '../helpers/test-data.helper';

const VALID_GEOCODE = {
  lat: 40.1792,
  lng: 44.4991,
  formattedAddress: '10 Tamanyan St, Yerevan',
  city: 'Yerevan',
  region: null,
  country: 'AM',
  street: 'Tamanyan St',
  buildingNumber: '10',
  placeKind: 'house' as const,
  addressLine: 'Tamanyan St, 10',
};

function buildCsvBuffer(rows?: Array<Record<string, string>>): Buffer {
  const header =
    'title,description,propertyType,city,address,maxGuests,bedrooms,beds,bathrooms,pricePerNight,cancellationPolicy';
  const dataRows = (
    rows ?? [
      {
        title: 'Test Apartment',
        description: 'A nice apartment.',
        propertyType: 'APARTMENT',
        city: 'Yerevan',
        address: '10 Tamanyan St',
        maxGuests: '2',
        bedrooms: '1',
        beds: '1',
        bathrooms: '1',
        pricePerNight: '25000',
        cancellationPolicy: 'MODERATE',
      },
    ]
  ).map((row) => Object.values(row).join(','));
  return Buffer.from([header, ...dataRows].join('\n'), 'utf-8');
}

describe('Properties bulk import (e2e)', () => {
  let app: INestApplication;
  let redis: MockRedisService;
  let host: RegisteredHostUser;
  let prisma: PrismaService;

  const capturedEmails: Array<{ to: string; subject: string }> = [];

  const mockMailer = {
    send: jest.fn().mockImplementation((opts: { to: string; subject: string }) => {
      capturedEmails.push({ to: opts.to, subject: opts.subject });
      return Promise.resolve();
    }),
  };

  const mockGeocoding = {
    searchPlaces: jest.fn().mockResolvedValue([VALID_GEOCODE]),
    resolveAddressLabels: jest.fn().mockResolvedValue({
      en: '10 Tamanyan St, Yerevan',
      hy: '10 Թամանյան Փ., Երևան',
      ru: '10 Тамаянян ул., Ереvan',
    }),
  };

  const mockLlm = {
    complete: jest.fn(),
    completeHostCalendar: jest.fn(),
    generateHostCalendarSuggestions: jest.fn(),
    normalizeBulkPropertyRows: jest.fn().mockRejectedValue(new Error('LLM not mocked')),
  };

  beforeAll(async () => {
    redis = new MockRedisService();
    capturedEmails.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(new MockStorageService())
      .overrideProvider(RedisService)
      .useValue(redis)
      .overrideProvider(LlmService)
      .useValue(mockLlm)
      .overrideProvider(GeocodingService)
      .useValue(mockGeocoding)
      .overrideProvider(MailerService)
      .useValue(mockMailer)
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
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetE2eDatabase(prisma);
    capturedEmails.length = 0;
    redis.clearKv();
    mockMailer.send.mockClear();
    mockGeocoding.searchPlaces.mockResolvedValue([VALID_GEOCODE]);
    mockGeocoding.resolveAddressLabels.mockResolvedValue({ en: '10 Tamanyan St' });
    host = await registerHostUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /properties/bulk-import/analyze', () => {
    it('returns preview with valid row for a well-formed CSV', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildCsvBuffer(), { filename: 'import.csv', contentType: 'text/csv' })
        .expect(201);

      expect(res.body.previewId).toBeDefined();
      expect(res.body.summary.total).toBe(1);
      expect(res.body.summary.error).toBe(0);
      expect(res.body.rows[0].status).toMatch(/valid|fixed/);
    });

    it('marks row as error when address cannot be geocoded', async () => {
      mockGeocoding.searchPlaces.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildCsvBuffer(), { filename: 'import.csv', contentType: 'text/csv' })
        .expect(201);

      expect(res.body.summary.error).toBe(1);
      expect(res.body.rows[0].status).toBe('error');
      expect(res.body.rows[0].errors[0]).toContain('could not be resolved');
    });

    it('marks second row with same address as duplicate_in_file', async () => {
      const csv = buildCsvBuffer([
        {
          title: 'Apt 1',
          description: 'desc',
          propertyType: 'APARTMENT',
          city: 'Yerevan',
          address: '10 Tamanyan St',
          maxGuests: '2',
          bedrooms: '1',
          beds: '1',
          bathrooms: '1',
          pricePerNight: '25000',
          cancellationPolicy: 'MODERATE',
        },
        {
          title: 'Apt 2',
          description: 'desc 2',
          propertyType: 'APARTMENT',
          city: 'Yerevan',
          address: '10 Tamanyan St',
          maxGuests: '3',
          bedrooms: '2',
          beds: '2',
          bathrooms: '1',
          pricePerNight: '30000',
          cancellationPolicy: 'FLEXIBLE',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', csv, { filename: 'import.csv', contentType: 'text/csv' })
        .expect(201);

      expect(res.body.summary.total).toBe(2);
      const errorRow = res.body.rows.find((r: { status: string }) => r.status === 'error');
      expect(errorRow).toBeDefined();
      expect(errorRow.errors[0]).toContain('Duplicate');
    });

    it('returns 403 for non-host user', async () => {
      const guest = await registerUser(app);
      await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(guest.accessToken))
        .attach('file', buildCsvBuffer(), { filename: 'import.csv', contentType: 'text/csv' })
        .expect(403);
    });

    it('returns 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .attach('file', buildCsvBuffer(), { filename: 'import.csv', contentType: 'text/csv' })
        .expect(401);
    });
  });

  describe('POST /properties/bulk-import/confirm', () => {
    it('returns 202 with jobId and creates DRAFT properties in background', async () => {
      const analyzeRes = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildCsvBuffer(), { filename: 'import.csv', contentType: 'text/csv' })
        .expect(201);

      const { previewId } = analyzeRes.body as { previewId: string };

      const confirmRes = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/confirm')
        .set(authHeader(host.accessToken))
        .send({ previewId })
        .expect(202);

      expect(confirmRes.body.jobId).toBeDefined();
      expect(confirmRes.body.status).toBe('processing');

      // Wait briefly for background job to run
      await new Promise((resolve) => setTimeout(resolve, 500));

      const properties = await prisma.property.findMany({
        where: { host: { userId: host.userId } },
      });
      expect(properties.some((p) => p.status === 'DRAFT')).toBe(true);
    });

    it('sends a results email after import completes', async () => {
      const analyzeRes = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildCsvBuffer(), { filename: 'import.csv', contentType: 'text/csv' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/confirm')
        .set(authHeader(host.accessToken))
        .send({ previewId: (analyzeRes.body as { previewId: string }).previewId })
        .expect(202);

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(mockMailer.send).toHaveBeenCalled();
      const emailArg = mockMailer.send.mock.calls[0][0] as { to: string; subject: string };
      expect(emailArg.to).toBe(host.email);
      expect(emailArg.subject).toContain('import');
    });

    it('returns 404 for expired or missing previewId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/confirm')
        .set(authHeader(host.accessToken))
        .send({ previewId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('returns 403 for non-host user', async () => {
      const guest = await registerUser(app);
      await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/confirm')
        .set(authHeader(guest.accessToken))
        .send({ previewId: '00000000-0000-0000-0000-000000000000' })
        .expect(403);
    });
  });

  describe('GET /properties/bulk-import/jobs/:jobId', () => {
    it('returns job status after confirm', async () => {
      const analyzeRes = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildCsvBuffer(), { filename: 'import.csv', contentType: 'text/csv' })
        .expect(201);

      const confirmRes = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/confirm')
        .set(authHeader(host.accessToken))
        .send({ previewId: (analyzeRes.body as { previewId: string }).previewId })
        .expect(202);

      const { jobId } = confirmRes.body as { jobId: string };
      await new Promise((resolve) => setTimeout(resolve, 600));

      const jobRes = await request(app.getHttpServer())
        .get(`/api/v1/properties/bulk-import/jobs/${jobId}`)
        .set(authHeader(host.accessToken))
        .expect(200);

      expect(['processing', 'completed', 'completed_with_email_error']).toContain(
        jobRes.body.status,
      );
    });

    it('returns 404 for unknown job', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/properties/bulk-import/jobs/00000000-0000-0000-0000-000000000000')
        .set(authHeader(host.accessToken))
        .expect(404);
    });
  });

  describe('Bulk import field defaults', () => {
    function buildMinimalCsvBuffer(extra: Record<string, string> = {}): Buffer {
      const row = {
        city: 'Yerevan',
        address: '10 Tamanyan St',
        maxGuests: '2',
        bedrooms: '1',
        beds: '1',
        bathrooms: '1',
        pricePerNight: '15000',
        cancellationPolicy: 'FLEXIBLE',
        ...extra,
      };
      const header = Object.keys(row).join(',');
      const dataRow = Object.values(row).join(',');
      return Buffer.from([header, dataRow].join('\n'), 'utf-8');
    }

    it('applies APARTMENT default when propertyType is omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildMinimalCsvBuffer(), {
          filename: 'import.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      const row = res.body.rows[0];
      expect(row.status).toMatch(/valid|fixed/);
      expect(row.normalized.propertyType).toBe('APARTMENT');
      const fix = row.fixes.find((f: { field: string }) => f.field === 'propertyType');
      expect(fix).toBeDefined();
    });

    it('generates title from formattedAddress when title is omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildMinimalCsvBuffer(), {
          filename: 'import.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      const row = res.body.rows[0];
      expect(row.normalized.title).toBeTruthy();
      expect(row.normalized.title).toContain('Tamanyan');
    });

    it('auto-generates description when description is omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildMinimalCsvBuffer(), {
          filename: 'import.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      const row = res.body.rows[0];
      expect(row.normalized.description).toBeTruthy();
      const descFix = row.fixes.find((f: { field: string }) => f.field === 'description');
      expect(descFix).toBeDefined();
    });

    it('defaults cleaningFee and securityDeposit to 0 when omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildMinimalCsvBuffer(), {
          filename: 'import.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      const row = res.body.rows[0];
      expect(row.normalized.cleaningFee).toBe(0);
      expect(row.normalized.securityDeposit).toBe(0);
    });

    it('does not overwrite title when provided in file', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach(
          'file',
          buildMinimalCsvBuffer({
            title: 'My Custom Title',
            description: 'Custom desc',
            propertyType: 'HOUSE',
          }),
          {
            filename: 'import.csv',
            contentType: 'text/csv',
          },
        )
        .expect(201);

      const row = res.body.rows[0];
      expect(row.normalized.title).toBe('My Custom Title');
      expect(row.normalized.description).toBe('Custom desc');
      expect(row.normalized.propertyType).toBe('HOUSE');
      const titleFix = row.fixes.find((f: { field: string }) => f.field === 'title');
      expect(titleFix).toBeUndefined();
    });

    it('confirms minimal row and creates DRAFT property with zero fees', async () => {
      const analyzeRes = await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/analyze')
        .set(authHeader(host.accessToken))
        .attach('file', buildMinimalCsvBuffer(), {
          filename: 'import.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      const { previewId } = analyzeRes.body as { previewId: string };

      await request(app.getHttpServer())
        .post('/api/v1/properties/bulk-import/confirm')
        .set(authHeader(host.accessToken))
        .send({ previewId })
        .expect(202);

      await new Promise((resolve) => setTimeout(resolve, 600));

      const properties = await prisma.property.findMany({
        where: { host: { userId: host.userId } },
      });
      expect(properties.length).toBeGreaterThan(0);
      const created = properties[0];
      expect(created.status).toBe('DRAFT');
      expect(Number(created.cleaningFee)).toBe(0);
      expect(Number(created.securityDeposit)).toBe(0);
    });
  });

  describe('Duplicate detection on single POST /properties', () => {
    it('returns 409 when creating a property at an already-used address', async () => {
      // Create first property directly via Prisma to skip geocoding in e2e
      await prisma.property.create({
        data: {
          hostId: host.hostProfileId,
          title: 'Existing Apartment',
          slug: 'existing-apartment',
          description: 'desc',
          propertyType: 'APARTMENT',
          city: 'Yerevan',
          country: 'AM',
          street: 'Tamanyan St',
          buildingNumber: '10',
          latitude: 40.1792,
          longitude: 44.4991,
          placeKind: 'house',
          maxGuests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          pricePerNight: 25000,
          cancellationPolicy: 'MODERATE',
          status: 'PENDING_REVIEW',
        },
      });

      const duplicate = {
        ...sampleProperty,
        placeKind: 'house',
        street: 'Tamanyan St',
        buildingNumber: '10',
        latitude: 40.1792,
        longitude: 44.4991,
      };

      await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set(authHeader(host.accessToken))
        .send(duplicate)
        .expect(409);
    });
  });
});
