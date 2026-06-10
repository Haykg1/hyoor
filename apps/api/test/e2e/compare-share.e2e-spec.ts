import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp, type TestAppContext } from '../helpers/create-test-app';

describe('Compare share (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a share token and resolves it back to the property IDs', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/compare-share')
      .send({ leftId: 'property-left', rightId: 'property-right' })
      .expect(201);
    const created = createResponse.body.data as { token: string; expiresInSeconds: number };
    expect(created.token).toEqual(expect.any(String));
    expect(created.token.length).toBeGreaterThan(0);
    expect(created.expiresInSeconds).toBe(24 * 60 * 60);
    const resolveResponse = await request(app.getHttpServer())
      .get(`/api/v1/compare-share/${created.token}`)
      .expect(200);
    const resolved = resolveResponse.body.data as { leftId: string; rightId: string };
    expect(resolved).toEqual({ leftId: 'property-left', rightId: 'property-right' });
  });

  it('returns 404 for an unknown token', async () => {
    await request(app.getHttpServer()).get('/api/v1/compare-share/does-not-exist').expect(404);
  });

  it('returns 400 when both property IDs are identical', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/compare-share')
      .send({ leftId: 'same-id', rightId: 'same-id' })
      .expect(400);
  });

  it('returns 400 when a property ID is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/compare-share')
      .send({ leftId: 'only-left' })
      .expect(400);
  });
});
