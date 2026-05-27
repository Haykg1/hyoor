import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser } from '../helpers/test-data.helper';

describe('Host profiles (e2e)', () => {
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

  it('creates a host profile and promotes user role to HOST', async () => {
    const user = await registerUser(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'INDIVIDUAL' })
      .expect(201);
    expect(response.body.data.hostType).toBe('INDIVIDUAL');
    expect(response.body.data.userId).toBe(user.userId);
    const prisma = app.get(PrismaService);
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    expect(dbUser?.role).toBe('HOST');
  });

  it('rejects duplicate host profile creation', async () => {
    const user = await registerUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'INDIVIDUAL' })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'INDIVIDUAL' })
      .expect(409);
    expect(response.body.success).toBe(false);
  });

  it('requires company name for company host type', async () => {
    const user = await registerUser(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'COMPANY' })
      .expect(400);
    expect(response.body.success).toBe(false);
  });

  it('returns own host profile at GET /host-profiles/me', async () => {
    const user = await registerUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'COMPANY', companyName: 'RentStar LLC' })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/host-profiles/me')
      .set(authHeader(user.accessToken))
      .expect(200);
    expect(response.body.data.companyName).toBe('RentStar LLC');
    expect(response.body.data.hostType).toBe('COMPANY');
  });

  it('updates host profile fields', async () => {
    const user = await registerUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'INDIVIDUAL' })
      .expect(201);
    const response = await request(app.getHttpServer())
      .patch('/api/v1/host-profiles/me')
      .set(authHeader(user.accessToken))
      .send({ payoutEmail: 'payout@rentstar.am' })
      .expect(200);
    expect(response.body.data.payoutEmail).toBe('payout@rentstar.am');
  });

  it('returns public host profile by id', async () => {
    const user = await registerUser(app, { firstName: 'Host', lastName: 'Public' });
    const create = await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'INDIVIDUAL' })
      .expect(201);
    const hostProfileId = create.body.data.id as string;
    const response = await request(app.getHttpServer())
      .get(`/api/v1/host-profiles/${hostProfileId}`)
      .expect(200);
    expect(response.body.data).toMatchObject({
      id: hostProfileId,
      hostType: 'INDIVIDUAL',
      displayName: 'Host Public',
      isVerified: false,
    });
    expect(response.body.data.email).toBeUndefined();
  });

  it('uploads company logo via mocked storage', async () => {
    const user = await registerUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'COMPANY', companyName: 'Logo Co' })
      .expect(201);
    const upload = await request(app.getHttpServer())
      .post('/api/v1/host-profiles/me/logo')
      .set(authHeader(user.accessToken))
      .attach('file', Buffer.from('logo-bytes'), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(upload.body.data.logoKey).toMatch(/^logos\//);
    expect(storage.hasFile(upload.body.data.logoKey)).toBe(true);
  });

  it('allows admin to verify a host profile', async () => {
    const user = await registerUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'INDIVIDUAL' })
      .expect(201);
    const hostProfileId = create.body.data.id as string;
    const prisma = app.get(PrismaService);
    const admin = await registerUser(app, { email: `admin-${Date.now()}@e2e.rentstar.test` });
    await prisma.user.update({
      where: { id: admin.userId },
      data: { role: 'ADMIN' },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/host-profiles/${hostProfileId}/verify`)
      .set(authHeader(adminLogin.body.data.accessToken))
      .expect(200);
    expect(response.body.data.isVerified).toBe(true);
  });

  it('forbids guest from verifying host profiles', async () => {
    const user = await registerUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/host-profiles')
      .set(authHeader(user.accessToken))
      .send({ hostType: 'INDIVIDUAL' })
      .expect(201);
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/host-profiles/${create.body.data.id}/verify`)
      .set(authHeader(user.accessToken))
      .expect(403);
    expect(response.body.success).toBe(false);
  });
});
