import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  buildDestinationGeoKey,
  buildDestinationMetaKey,
  buildPoiGeoKey,
  buildPoiMetaKey,
} from '@repo/shared';
import { DESTINATION_DATASETS, METRO_POI_DATASETS } from '@repo/shared/data/poi-datasets';

import { RedisService } from '../redis/redis.service';

@Injectable()
export class PoiSeedService implements OnModuleInit {
  private readonly logger = new Logger(PoiSeedService.name);

  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    if (!this.redis.isConfigured) return;
    for (const dataset of METRO_POI_DATASETS) {
      await this.seedGeoDataset(
        buildPoiGeoKey(dataset.category, dataset.citySlug),
        buildPoiMetaKey(dataset.category, dataset.citySlug),
        dataset.stations.map((station) => ({
          id: station.id,
          longitude: station.longitude,
          latitude: station.latitude,
          meta: JSON.stringify(station.nameLabels),
        })),
      );
    }
    for (const dataset of DESTINATION_DATASETS) {
      const geoKey = buildDestinationGeoKey(dataset.citySlug);
      const metaKey = buildDestinationMetaKey(dataset.citySlug);
      await this.seedGeoDataset(
        geoKey,
        metaKey,
        dataset.destinations.map((destination) => ({
          id: destination.id,
          longitude: destination.longitude,
          latitude: destination.latitude,
          meta: JSON.stringify(destination),
        })),
      );
    }
  }

  private async seedGeoDataset(
    geoKey: string,
    metaKey: string,
    entries: { id: string; longitude: number; latitude: number; meta: string }[],
  ): Promise<void> {
    const count = await this.redis.zcard(geoKey);
    if (count > 0) {
      this.logger.log(`POI GEO already seeded for ${geoKey} (${count} members)`);
      return;
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
  }
}
