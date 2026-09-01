import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildDestinationGeoKey,
  buildDestinationMetaKey,
  buildPlannerCandidateVersionKey,
  buildPoiGeoKey,
  buildPoiMetaKey,
  YEREVAN_NEARBY_CITY_SLUGS,
} from '@repo/shared';
import { DESTINATION_DATASETS, METRO_POI_DATASETS } from '@repo/shared/data/poi-datasets';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

import { redisMetaFromPoi, type PoiRecord } from './poi-mapper';

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
    private readonly prisma: PrismaService,
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

  async forceSeed(): Promise<PoiSeedResult> {
    return this.seedAll({ force: true });
  }

  async syncCity(citySlug: string): Promise<void> {
    if (!this.redis.isConfigured) return;
    const slugs = new Set<string>([citySlug]);
    if ((YEREVAN_NEARBY_CITY_SLUGS as readonly string[]).includes(citySlug)) {
      slugs.add('yerevan');
    }
    if (citySlug === 'yerevan') {
      for (const nearby of YEREVAN_NEARBY_CITY_SLUGS) slugs.add(nearby);
    }
    for (const slug of slugs) {
      await this.seedDestinationCity(slug, true);
      await this.bumpPlannerCandidateVersion(slug);
    }
  }

  /** Invalidates the trip-planner candidate cache for a city after a catalog change. */
  private async bumpPlannerCandidateVersion(citySlug: string): Promise<void> {
    if (!this.redis.isConfigured) return;
    try {
      await this.redis.incrWithTtl(buildPlannerCandidateVersionKey(citySlug), 60 * 60 * 24 * 30);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to bump planner candidate version for ${citySlug}: ${message}`);
    }
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
    const dbPois = await this.loadPublishedPois();
    const citySlugs =
      dbPois.length > 0
        ? [...new Set(dbPois.map((poi) => poi.citySlug))]
        : DESTINATION_DATASETS.map((dataset) => dataset.citySlug);
    for (const citySlug of citySlugs) {
      seededEntries += await this.seedDestinationCity(citySlug, options.force, dbPois);
    }
    if (dbPois.length > 0 && !citySlugs.includes('yerevan')) {
      seededEntries += await this.seedDestinationCity('yerevan', options.force, dbPois);
    }
    return {
      metroDatasets: METRO_POI_DATASETS.length,
      destinationDatasets: citySlugs.length,
      seededEntries,
    };
  }

  private async loadPublishedPois(): Promise<PoiRecord[]> {
    const rows = await this.prisma.poi.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ citySlug: 'asc' }, { sortOrder: 'asc' }],
    });
    return rows as unknown as PoiRecord[];
  }

  private async seedDestinationCity(
    citySlug: string,
    force: boolean,
    allPois?: PoiRecord[],
  ): Promise<number> {
    const pois = allPois ?? (await this.loadPublishedPois());
    const entries =
      pois.length > 0
        ? this.destinationEntriesFromDb(citySlug, pois)
        : this.destinationEntriesFromJson(citySlug);
    return this.seedGeoDataset(
      buildDestinationGeoKey(citySlug),
      buildDestinationMetaKey(citySlug),
      entries,
      force,
    );
  }

  private destinationEntriesFromDb(
    citySlug: string,
    pois: PoiRecord[],
  ): { id: string; longitude: number; latitude: number; meta: string }[] {
    const includeNearby = citySlug === 'yerevan';
    return pois
      .filter((poi) => {
        if (poi.citySlug === citySlug) return true;
        return (
          includeNearby && (YEREVAN_NEARBY_CITY_SLUGS as readonly string[]).includes(poi.citySlug)
        );
      })
      .map((poi) => {
        const destination = JSON.parse(redisMetaFromPoi(poi)) as {
          longitude: number;
          latitude: number;
        };
        return {
          id: poi.id,
          longitude: destination.longitude,
          latitude: destination.latitude,
          meta: redisMetaFromPoi(poi),
        };
      });
  }

  private destinationEntriesFromJson(
    citySlug: string,
  ): { id: string; longitude: number; latitude: number; meta: string }[] {
    const dataset = DESTINATION_DATASETS.find((entry) => entry.citySlug === citySlug);
    if (!dataset) return [];
    return dataset.destinations.map((destination) => ({
      id: destination.id,
      longitude: destination.longitude,
      latitude: destination.latitude,
      meta: JSON.stringify(destination),
    }));
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
    if (entries.length === 0) return 0;
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
