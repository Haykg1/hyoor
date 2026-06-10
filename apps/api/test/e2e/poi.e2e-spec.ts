import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp, type TestAppContext } from '../helpers/create-test-app';

describe('POI (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns nearest Yerevan metro station for Republic Square coordinates', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/poi/nearest-metro')
      .query({
        latitude: 40.178515,
        longitude: 44.515628,
        city: 'Yerevan',
        region: 'Yerevan',
      })
      .expect(200);
    const body = response.body.data as {
      station: { id: string } | null;
      distanceMeters: number | null;
      approximate: boolean;
    };
    expect(body.station).not.toBeNull();
    expect(body.station?.id).toBe('republic-square');
    expect(body.distanceMeters).not.toBeNull();
    expect(body.distanceMeters).toBeLessThan(200);
    expect(body.approximate).toBe(true);
  });

  it('returns null station for cities without metro POI data', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/poi/nearest-metro')
      .query({
        latitude: 40.178515,
        longitude: 44.515628,
        city: 'Gyumri',
        region: 'Shirak',
      })
      .expect(200);
    const body = response.body.data as { station: null };
    expect(body.station).toBeNull();
  });

  it('returns null when nearest metro is beyond 2 km', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/poi/nearest-metro')
      .query({
        latitude: 40.178515,
        longitude: 44.545628,
        city: 'Yerevan',
        region: 'Yerevan',
      })
      .expect(200);
    const body = response.body.data as { station: null };
    expect(body.station).toBeNull();
  });

  it('returns 400 for coordinates outside Armenia', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/poi/nearest-metro')
      .query({
        latitude: 48.8,
        longitude: 2.3,
        city: 'Paris',
      })
      .expect(400);
  });

  it('returns sorted Yerevan destination POIs for Republic Square coordinates', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/poi/nearby-destinations')
      .query({
        latitude: 40.178515,
        longitude: 44.515628,
        city: 'Yerevan',
        region: 'Yerevan',
      })
      .expect(200);
    const body = response.body.data as {
      citySlug: string;
      pois: { id: string; distanceMeters: number }[];
    };
    expect(body.citySlug).toBe('yerevan');
    expect(body.pois.length).toBeGreaterThan(0);
    expect(body.pois.some((poi) => poi.id === 'republic_square')).toBe(true);
    for (let index = 1; index < body.pois.length; index += 1) {
      const previous = body.pois[index - 1];
      const current = body.pois[index];
      if (!previous || !current) continue;
      expect(current.distanceMeters).toBeGreaterThanOrEqual(previous.distanceMeters);
    }
  });

  it('returns empty destinations for unknown city', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/poi/nearby-destinations')
      .query({
        latitude: 40.178515,
        longitude: 44.515628,
        city: 'Paris',
        region: 'Paris',
      })
      .expect(200);
    const body = response.body.data as { citySlug: null; pois: [] };
    expect(body.citySlug).toBeNull();
    expect(body.pois).toEqual([]);
  });
});
