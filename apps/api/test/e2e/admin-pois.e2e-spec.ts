import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

async function registerAdmin(
  app: INestApplication,
): Promise<Awaited<ReturnType<typeof registerUser>> & { accessToken: string }> {
  const admin = await registerUser(app, { email: uniqueEmail('admin-poi') });
  const prisma = app.get(PrismaService);
  await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: admin.email, password: admin.password })
    .expect(201);
  return { ...admin, accessToken: login.body.data.accessToken as string };
}

describe('Admin POIs (e2e)', () => {
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

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/pois').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/admin/pois')
      .send({ city: 'Yerevan' })
      .expect(401);
  });

  it('rejects a guest', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('guest-poi') });
    await request(app.getHttpServer())
      .get('/api/v1/admin/pois')
      .set(authHeader(guest.accessToken))
      .expect(403);
  });

  it('allows admin to create, list, update, and delete a POI', async () => {
    const admin = await registerAdmin(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/admin/pois')
      .set(authHeader(admin.accessToken))
      .send({
        id: 'e2e_cascade',
        city: 'Yerevan',
        region: 'Yerevan',
        latitude: 40.191,
        longitude: 44.515,
        category: 'landmark',
        tags: ['historical', 'culture'],
        nameLabels: { en: 'Cascade', hy: 'Կասկադ', ru: 'Каскад' },
        descriptionLabels: {
          en: 'Sculpture-lined stairs',
          hy: 'Քանդակներով աստիճաններ',
          ru: 'Лестница со скульптурами',
        },
        status: 'PUBLISHED',
        usableInPlanner: true,
        attributes: { typicalDurationMin: 90 },
      })
      .expect(201);
    expect(create.body.data.id).toBe('e2e_cascade');
    expect(create.body.data.usableInPlanner).toBe(true);
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/pois')
      .query({ search: 'e2e_cascade' })
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);
    const updated = await request(app.getHttpServer())
      .patch('/api/v1/admin/pois/e2e_cascade')
      .set(authHeader(admin.accessToken))
      .send({ sortOrder: 12 })
      .expect(200);
    expect(updated.body.data.sortOrder).toBe(12);
    await request(app.getHttpServer())
      .delete('/api/v1/admin/pois/e2e_cascade')
      .set(authHeader(admin.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/admin/pois/e2e_cascade')
      .set(authHeader(admin.accessToken))
      .expect(404);
  });

  it('drops attribute fields that do not belong to the category', async () => {
    const admin = await registerAdmin(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/admin/pois')
      .set(authHeader(admin.accessToken))
      .send({
        id: 'e2e_church',
        city: 'Yerevan',
        region: 'Yerevan',
        latitude: 40.185,
        longitude: 44.517,
        category: 'church',
        nameLabels: { en: 'Katoghike', hy: 'Կաթողիկե', ru: 'Католике' },
        descriptionLabels: { en: 'Medieval church', hy: '—', ru: '—' },
        attributes: {
          averageMealAmd: 8000,
          servesAlcohol: true,
          priceBand: 'mid',
          websiteMenu: 'https://x/menu',
          typicalDurationMin: 20,
          openingHoursNote: '08:00-20:00',
        },
      })
      .expect(201);
    expect(create.body.data.attributes).toEqual({
      typicalDurationMin: 20,
      openingHoursNote: '08:00-20:00',
    });
    // Switching a restaurant to a church later must also strip the food fields.
    await request(app.getHttpServer())
      .post('/api/v1/admin/pois')
      .set(authHeader(admin.accessToken))
      .send({
        id: 'e2e_place',
        city: 'Yerevan',
        region: 'Yerevan',
        latitude: 40.18,
        longitude: 44.51,
        category: 'restaurant',
        nameLabels: { en: 'Place', hy: 'Place', ru: 'Place' },
        descriptionLabels: { en: '—', hy: '—', ru: '—' },
        attributes: { averageMealAmd: 6000, servesAlcohol: true },
      })
      .expect(201);
    const switched = await request(app.getHttpServer())
      .patch('/api/v1/admin/pois/e2e_place')
      .set(authHeader(admin.accessToken))
      .send({ category: 'church', attributes: { averageMealAmd: 6000, servesAlcohol: true } })
      .expect(200);
    expect(switched.body.data.attributes.averageMealAmd).toBeUndefined();
    expect(switched.body.data.attributes.servesAlcohol).toBeUndefined();
  });

  it('approves and rejects a pending POI photo', async () => {
    const admin = await registerAdmin(app);
    const prisma = app.get(PrismaService);
    await prisma.poi.create({
      data: {
        id: 'e2e_photo_poi',
        city: 'Yerevan',
        region: 'Yerevan',
        country: 'AM',
        citySlug: 'yerevan',
        latitude: 40.18,
        longitude: 44.51,
        category: 'landmark',
        tags: ['historical'],
        nameLabels: { en: 'Photo POI', hy: 'Photo POI', ru: 'Photo POI' },
        descriptionLabels: { en: 'x', hy: 'x', ru: 'x' },
        status: 'PUBLISHED',
        usableInPlanner: true,
      },
    });
    const photo = await prisma.poiPhoto.create({
      data: {
        poiId: 'e2e_photo_poi',
        key: 'pois/e2e_photo_poi/a.jpg',
        status: 'PENDING_REVIEW',
        attribution: 'By Someone — CC BY-SA 4.0, via Wikimedia Commons',
        license: 'CC BY-SA 4.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:a.jpg',
      },
    });
    const approved = await request(app.getHttpServer())
      .patch(`/api/v1/admin/pois/e2e_photo_poi/photos/${photo.id}`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'APPROVED' })
      .expect(200);
    expect(approved.body.data.status).toBe('APPROVED');
    expect(approved.body.data.attribution).toContain('CC BY-SA 4.0');
    const detail = await request(app.getHttpServer())
      .get('/api/v1/admin/pois/e2e_photo_poi')
      .set(authHeader(admin.accessToken))
      .expect(200);
    expect(detail.body.data.photos[0].status).toBe('APPROVED');
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/pois/e2e_photo_poi/photos/${photo.id}`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'REJECTED' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/pois/e2e_photo_poi/photos/missing')
      .set(authHeader(admin.accessToken))
      .send({ status: 'APPROVED' })
      .expect(404);
  });
});
