import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';
import { RedisService } from '../redis/redis.service';

import { PoiSeedService } from './poi-seed.service';

describe('PoiSeedService', () => {
  const redis = {
    isConfigured: true,
    zcard: jest.fn(),
    del: jest.fn(),
    geoAdd: jest.fn(),
    hset: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };
  let service: PoiSeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    redis.isConfigured = true;
    redis.zcard.mockResolvedValue(0);
    redis.del.mockResolvedValue(undefined);
    redis.geoAdd.mockResolvedValue(undefined);
    redis.hset.mockResolvedValue(undefined);
    config.get.mockReturnValue(false);
    service = new PoiSeedService(
      redis as unknown as RedisService,
      config as unknown as ConfigService<AppConfig, true>,
    );
  });

  it('skips boot seed when POI_SEED_ON_BOOT is not true', async () => {
    config.get.mockReturnValue(false);
    await service.onModuleInit();
    expect(redis.geoAdd).not.toHaveBeenCalled();
  });

  it('seeds on boot when flag is true and Redis is empty', async () => {
    config.get.mockReturnValue(true);
    await service.onModuleInit();
    expect(redis.geoAdd).toHaveBeenCalled();
  });

  it('skips non-force seed when GEO already has members', async () => {
    redis.zcard.mockResolvedValue(12);
    const result = await service.seedAll({ force: false });
    expect(result.seededEntries).toBe(0);
    expect(redis.geoAdd).not.toHaveBeenCalled();
  });

  it('forceSeed clears keys and reseeds', async () => {
    redis.zcard.mockResolvedValue(12);
    const result = await service.forceSeed();
    expect(redis.del).toHaveBeenCalled();
    expect(redis.geoAdd).toHaveBeenCalled();
    expect(result.seededEntries).toBeGreaterThan(0);
    expect(result.metroDatasets).toBeGreaterThan(0);
    expect(result.destinationDatasets).toBeGreaterThan(0);
  });

  it('throws when Redis is not configured', async () => {
    redis.isConfigured = false;
    await expect(service.forceSeed()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
