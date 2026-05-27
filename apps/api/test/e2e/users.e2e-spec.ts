import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser } from '../helpers/test-data.helper';

describe('Users (e2e)', () => {
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

  it('rejects unauthenticated access to /users/me', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    expect(response.body.success).toBe(false);
  });

  it('returns the authenticated user profile without password hash', async () => {
    const user = await registerUser(app, { firstName: 'Profile', lastName: 'Owner' });
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set(authHeader(user.accessToken))
      .expect(200);
    expect(response.body.data).toMatchObject({
      id: user.userId,
      email: user.email,
      profile: {
        firstName: 'Profile',
        lastName: 'Owner',
      },
    });
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it('updates profile fields for the current user', async () => {
    const user = await registerUser(app);
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set(authHeader(user.accessToken))
      .send({
        bio: 'E2E bio',
        nationality: 'AM',
        phone: '+37491111222',
      })
      .expect(200);
    expect(response.body.data.profile).toMatchObject({
      bio: 'E2E bio',
      nationality: 'AM',
      phone: '+37491111222',
    });
  });

  it('changes password for the current user', async () => {
    const user = await registerUser(app, { password: 'OldPassword1!' });
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/password')
      .set(authHeader(user.accessToken))
      .send({
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword2!',
      })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'NewPassword2!' })
      .expect(201);
  });

  it('returns a public profile subset without sensitive fields', async () => {
    const user = await registerUser(app, { firstName: 'Public', lastName: 'Face' });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/users/${user.userId}`)
      .expect(200);
    expect(response.body.data).toEqual({
      id: user.userId,
      firstName: 'Public',
      lastName: 'Face',
      avatarUrl: null,
      hostRating: null,
      isHost: false,
    });
    expect(response.body.data.email).toBeUndefined();
  });

  it('marks host users on public profile when host profile exists', async () => {
    const user = await registerUser(app, { firstName: 'Host', lastName: 'Person' });
    const prisma = app.get(PrismaService);
    await prisma.hostProfile.create({
      data: {
        userId: user.userId,
        hostType: 'INDIVIDUAL',
      },
    });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/users/${user.userId}`)
      .expect(200);
    expect(response.body.data.isHost).toBe(true);
    expect(response.body.data.hostRating).toBeNull();
  });

  it('uploads and deletes avatar using mocked storage', async () => {
    const user = await registerUser(app);
    const upload = await request(app.getHttpServer())
      .post('/api/v1/users/me/avatar')
      .set(authHeader(user.accessToken))
      .attach('file', Buffer.from('fake-image-bytes'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    expect(upload.body.data.avatarKey).toMatch(/^avatars\//);
    expect(upload.body.data.avatarUrl).toContain('e2e-storage.test');
    expect(storage.hasFile(upload.body.data.avatarKey)).toBe(true);
    await request(app.getHttpServer())
      .delete('/api/v1/users/me/avatar')
      .set(authHeader(user.accessToken))
      .expect(200);
    expect(storage.hasFile(upload.body.data.avatarKey)).toBe(false);
  });
});
