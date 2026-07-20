import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { resetE2eDatabase } from '../helpers/reset-database';

describe('Currency (e2e)', () => {
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

  it('returns display-default without auth', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/currency/display-default')
      .expect(200);
    expect(typeof response.body.data.currency).toBe('string');
    expect(response.body.data.currency.length).toBeGreaterThan(0);
  });

  it('returns rates payload without auth', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/currency/rates').expect(200);
    const data = response.body.data;
    expect(data.base).toBe('USD');
    expect(data.rates).toEqual(expect.any(Object));
    expect(data.fetchedAt === null || typeof data.fetchedAt === 'string').toBe(true);
  });
});
