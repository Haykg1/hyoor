import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { createActivePropertyDirect, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

describe('Favorites (e2e)', () => {
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

  it('returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/favorites/ids').expect(401);
  });

  it('returns 403 for host and admin on all favorites routes', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const adminUser = await registerUser(app, { email: uniqueEmail('admin') });
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: adminUser.userId }, data: { role: 'ADMIN' } });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(201);
    const adminToken = adminLogin.body.data.accessToken as string;
    const guestOnlyRoutes = [
      { method: 'get' as const, path: '/api/v1/favorites/ids' },
      { method: 'get' as const, path: '/api/v1/favorites' },
      { method: 'post' as const, path: `/api/v1/favorites/${property.id}` },
      { method: 'delete' as const, path: `/api/v1/favorites/${property.id}` },
    ];
    for (const route of guestOnlyRoutes) {
      await request(app.getHttpServer())
        [route.method](route.path)
        .set(authHeader(host.accessToken))
        .expect(403);
      await request(app.getHttpServer())
        [route.method](route.path)
        .set(authHeader(adminToken))
        .expect(403);
    }
  });

  it('guest can add, list ids, list paginated, filter by q, and remove favorites', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${property.id}`)
      .set(authHeader(guest.accessToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${property.id}`)
      .set(authHeader(guest.accessToken))
      .expect(201);
    const ids = await request(app.getHttpServer())
      .get('/api/v1/favorites/ids')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(ids.body.data).toEqual([property.id]);
    const list = await request(app.getHttpServer())
      .get('/api/v1/favorites')
      .query({ q: 'Favorites' })
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(list.body.data.data).toHaveLength(1);
    expect(list.body.data.data[0].id).toBe(property.id);
    const byCity = await request(app.getHttpServer())
      .get('/api/v1/favorites')
      .query({ cities: ['Yerevan'] })
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(byCity.body.data.data).toHaveLength(1);
    const byWrongCity = await request(app.getHttpServer())
      .get('/api/v1/favorites')
      .query({ cities: ['Gyumri'] })
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(byWrongCity.body.data.data).toHaveLength(0);
    await request(app.getHttpServer())
      .delete(`/api/v1/favorites/${property.id}`)
      .set(authHeader(guest.accessToken))
      .expect(204);
    const idsAfter = await request(app.getHttpServer())
      .get('/api/v1/favorites/ids')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(idsAfter.body.data).toEqual([]);
  });

  it('returns 404 when favoriting missing or inactive property', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    await request(app.getHttpServer())
      .post('/api/v1/favorites/nonexistent-id')
      .set(authHeader(guest.accessToken))
      .expect(404);
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const prisma = app.get(PrismaService);
    await prisma.property.update({
      where: { id: property.id },
      data: { status: 'DRAFT' },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${property.id}`)
      .set(authHeader(guest.accessToken))
      .expect(404);
  });

  it('returns 404 when removing a favorite that does not exist', async () => {
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    await request(app.getHttpServer())
      .delete('/api/v1/favorites/nonexistent-id')
      .set(authHeader(guest.accessToken))
      .expect(404);
  });
});
