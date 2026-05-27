import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';
import { registerHostUser, sampleProperty } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';

describe('Properties (e2e)', () => {
  let app: INestApplication;
  let storage: TestAppContext['storage'];

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
    storage = ctx.storage;
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetE2eDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a property as HOST in DRAFT status', async () => {
    const host = await registerHostUser(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    expect(response.body.data.status).toBe('DRAFT');
    expect(response.body.data.slug).toBe('cozy-yerevan-apartment');
    expect(response.body.data.hostId).toBe(host.hostProfileId);
  });

  it('rejects property creation for non-host users', async () => {
    const guest = await registerUser(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(guest.accessToken))
      .send(sampleProperty)
      .expect(403);
    expect(response.body.success).toBe(false);
  });

  it('searches ACTIVE properties with filters', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const prisma = app.get(PrismaService);
    await prisma.property.update({
      where: { id: create.body.data.id },
      data: { status: 'ACTIVE' },
    });
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties')
      .query({ city: 'Yerevan', maxGuests: 2 })
      .expect(200);
    expect(response.body.data.data).toHaveLength(1);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.data[0].title).toBe(sampleProperty.title);
  });

  it('returns property detail with photos and amenities for ACTIVE listing', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const prisma = app.get(PrismaService);
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'ACTIVE' },
    });
    await request(app.getHttpServer())
      .put(`/api/v1/properties/${propertyId}/amenities`)
      .set(authHeader(host.accessToken))
      .send({ amenities: [{ name: 'WiFi', category: 'Internet' }] })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos`)
      .set(authHeader(host.accessToken))
      .attach('file', Buffer.from('photo-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/properties/${propertyId}`)
      .expect(200);
    expect(response.body.data.amenities).toHaveLength(1);
    expect(response.body.data.photos).toHaveLength(1);
    expect(response.body.data.host).toBeDefined();
  });

  it('hides non-ACTIVE property from public detail', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    await request(app.getHttpServer()).get(`/api/v1/properties/${create.body.data.id}`).expect(404);
  });

  it('returns host own listings at GET /properties/my with pagination and stats', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties/my')
      .set(authHeader(host.accessToken))
      .expect(200);
    const body = response.body.data as {
      data: unknown[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      stats: { totalListings: number; activeListings: number; pendingRequests: number; totalEarnings: number };
    };
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
    expect(body.totalPages).toBe(1);
    expect(body.stats).toBeDefined();
    expect(body.stats.totalListings).toBe(1);
    expect(body.stats.pendingRequests).toBe(0);
    expect(body.stats.totalEarnings).toBe(0);
  });

  it('host A cannot see host B listings at GET /properties/my', async () => {
    const hostA = await registerHostUser(app);
    const hostB = await registerHostUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(hostA.accessToken))
      .send(sampleProperty)
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties/my')
      .set(authHeader(hostB.accessToken))
      .expect(200);
    const body = response.body.data as { data: unknown[]; total: number };
    expect(body.data).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('returns INACTIVE listings on ?tab=disabled and active on ?tab=active', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyId}`)
      .set(authHeader(host.accessToken))
      .expect(200);
    const activeResponse = await request(app.getHttpServer())
      .get('/api/v1/properties/my?tab=active')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((activeResponse.body.data as { data: unknown[] }).data).toHaveLength(0);
    const disabledResponse = await request(app.getHttpServer())
      .get('/api/v1/properties/my?tab=disabled')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((disabledResponse.body.data as { data: unknown[] }).data).toHaveLength(1);
  });

  it('rejects invalid limit at GET /properties/my', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .get('/api/v1/properties/my?limit=50')
      .set(authHeader(host.accessToken))
      .expect(400);
  });

  it('updates and soft-deletes owned property', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const update = await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}`)
      .set(authHeader(host.accessToken))
      .send({ title: 'Updated Apartment Title' })
      .expect(200);
    expect(update.body.data.title).toBe('Updated Apartment Title');
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyId}`)
      .set(authHeader(host.accessToken))
      .expect(200);
    const prisma = app.get(PrismaService);
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(property?.status).toBe('INACTIVE');
  });

  it('allows admin to change property status', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const admin = await registerUser(app, { email: uniqueEmail('admin') });
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}/status`)
      .set(authHeader(adminLogin.body.data.accessToken))
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(response.body.data.status).toBe('ACTIVE');
  });

  it('deletes property photo from storage and database', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const upload = await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos`)
      .set(authHeader(host.accessToken))
      .attach('file', Buffer.from('photo-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const photoId = upload.body.data.id as string;
    const photoKey = upload.body.data.key as string;
    expect(storage.hasFile(photoKey)).toBe(true);
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyId}/photos/${photoId}`)
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(storage.hasFile(photoKey)).toBe(false);
  });
});
