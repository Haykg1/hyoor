import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser } from '../helpers/test-data.helper';

describe('Host analytics (e2e)', () => {
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

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/v1/host-analytics').expect(401);
  });

  it('rejects non-host users', async () => {
    const guest = await registerUser(app);
    await request(app.getHttpServer())
      .get('/api/v1/host-analytics')
      .set(authHeader(guest.accessToken))
      .expect(403);
  });

  it('returns empty analytics shape for a host with no bookings', async () => {
    const host = await registerHostUser(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/host-analytics?preset=last_30_days')
      .set(authHeader(host.accessToken))
      .expect(200);
    const data = response.body.data;
    expect(data.period.preset).toBe('last_30_days');
    expect(data.period.from).toBeDefined();
    expect(data.period.to).toBeDefined();
    expect(data.previousPeriod.from).toBeDefined();
    expect(data.kpis.adr.value).toBeNull();
    expect(data.kpis.revpar.value).toBeNull();
    expect(data.kpis.nightsBooked.value).toBe(0);
    expect(data.kpis.cancellationRate.value).toBeNull();
    expect(Array.isArray(data.monthlyEarnings)).toBe(true);
    expect(data.monthlyEarnings.length).toBeGreaterThanOrEqual(1);
    expect(data.monthlyEarnings.length).toBeLessThanOrEqual(2);
    expect(Array.isArray(data.occupancyTrend)).toBe(true);
    expect(data.occupancyTrend).toHaveLength(data.monthlyEarnings.length);
    expect(data.guestOrigins).toEqual([]);
    expect(data.settlementCurrency).toBe('USD');
    expect(data.propertyId).toBeNull();
  });

  it('rejects propertyId that does not belong to the host', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .get('/api/v1/host-analytics?preset=last_30_days&propertyId=does-not-exist')
      .set(authHeader(host.accessToken))
      .expect(403);
  });
});
