import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildDestinationGeoKey,
  buildDestinationMetaKey,
  buildPoiGeoKey,
  buildPoiMetaKey,
} from '@repo/shared';
import { DESTINATION_DATASETS, METRO_POI_DATASETS } from '@repo/shared/data/poi-datasets';

import type { AppConfig } from '../config/configuration';
import { RedisService } from '../redis/redis.service';

export interface PoiSeedResult {
  metroDatasets: number;
  destinationDatasets: number;
  seededEntries: number;
}

@Injectable()
export class PoiSeedService implements OnModuleInit {
  private readonly logger = new Logger(PoiSeedService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const seedOnBoot = this.config.get('poi.seedOnBoot', { infer: true });
    if (!seedOnBoot) {
      this.logger.log('POI_SEED_ON_BOOT is not true — skipping Redis POI seed');
      return;
    }
    if (!this.redis.isConfigured) {
      this.logger.log('Redis is not configured — skipping POI seed');
      return;
    }
    try {
      await this.seedAll({ force: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`POI seed on boot failed: ${message}`);
    }
  }

  /**
   * Force-reseed all curated POI GEO indexes in Redis (admin use).
   */
  async forceSeed(): Promise<PoiSeedResult> {
    return this.seedAll({ force: true });
  }

  async seedAll(options: { force: boolean }): Promise<PoiSeedResult> {
    if (!this.redis.isConfigured) {
      throw new ServiceUnavailableException('Redis is not configured');
    }
    let seededEntries = 0;
    for (const dataset of METRO_POI_DATASETS) {
      seededEntries += await this.seedGeoDataset(
        buildPoiGeoKey(dataset.category, dataset.citySlug),
        buildPoiMetaKey(dataset.category, dataset.citySlug),
        dataset.stations.map((station) => ({
          id: station.id,
          longitude: station.longitude,
          latitude: station.latitude,
          meta: JSON.stringify(station.nameLabels),
        })),
        options.force,
      );
    }
    for (const dataset of DESTINATION_DATASETS) {
      seededEntries += await this.seedGeoDataset(
        buildDestinationGeoKey(dataset.citySlug),
        buildDestinationMetaKey(dataset.citySlug),
        dataset.destinations.map((destination) => ({
          id: destination.id,
          longitude: destination.longitude,
          latitude: destination.latitude,
          meta: JSON.stringify(destination),
        })),
        options.force,
      );
    }
    return {
      metroDatasets: METRO_POI_DATASETS.length,
      destinationDatasets: DESTINATION_DATASETS.length,
      seededEntries,
    };
  }

  private async seedGeoDataset(
    geoKey: string,
    metaKey: string,
    entries: { id: string; longitude: number; latitude: number; meta: string }[],
    force: boolean,
  ): Promise<number> {
    if (!force) {
      const count = await this.redis.zcard(geoKey);
      if (count > 0) {
        this.logger.log(`POI GEO already seeded for ${geoKey} (${count} members)`);
        return 0;
      }
    } else {
      await this.redis.del(geoKey);
      await this.redis.del(metaKey);
    }
    await this.redis.geoAdd(
      geoKey,
      entries.map((entry) => ({
        longitude: entry.longitude,
        latitude: entry.latitude,
        member: entry.id,
      })),
    );
    for (const entry of entries) {
      await this.redis.hset(metaKey, entry.id, entry.meta);
    }
    this.logger.log(`Seeded ${entries.length} POI entries into ${geoKey}`);
    return entries.length;
  }
}
