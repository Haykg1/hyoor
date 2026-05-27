import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser } from '../helpers/test-data.helper';

describe('Security: validation, headers (e2e)', () => {
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

  it('strips and rejects unknown body fields (forbidNonWhitelisted)', async () => {
    const user = await registerUser(app);
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set(authHeader(user.accessToken))
      .send({ firstName: 'New', hackerField: 'oops' })
      .expect(400);
    expect(response.body.success).toBe(false);
  });

  it('sets helmet security headers', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  it('coerces query strings to numbers via transformOptions', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/properties')
      .query({ page: '1', limit: '5', maxGuests: '2' })
      .expect(200);
  });

  it('rejects unknown query parameters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties')
      .query({ bogus: 'value' })
      .expect(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects oversized photo uploads with 5MB cap', async () => {
    const user = await registerUser(app);
    const oversized = Buffer.alloc(6 * 1024 * 1024, 0);
    await request(app.getHttpServer())
      .post('/api/v1/users/me/avatar')
      .set(authHeader(user.accessToken))
      .attach('file', oversized, { filename: 'big.png', contentType: 'image/png' })
      .expect((res) => {
        if (res.status !== 413 && res.status !== 400) {
          throw new Error(`Expected 413 or 400, got ${res.status}`);
        }
      });
  });
});
