import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NearbyPoiItem,
  NearbyPoisResponse,
  NearestMetroResponse,
  PoiCityOption,
  PoiDestination,
  PoiNameLabels,
} from '@repo/shared';
import {
  buildDestinationGeoKey,
  buildDestinationMetaKey,
  buildPoiGeoKey,
  buildPoiMetaKey,
  computeDistanceKm,
  computeDistanceMeters,
  MAX_FEATURED_POIS,
  resolveDestinationCitySlug,
  YEREVAN_NEARBY_CITY_SLUGS,
} from '@repo/shared';
import { METRO_POI_DATASETS } from '@repo/shared/data/poi-datasets';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

import { toCoord, toPoiDestination, type PoiRecord } from './poi-mapper';
import {
  NEARBY_DESTINATIONS_MAX_COUNT,
  NEARBY_DESTINATIONS_MAX_RADIUS_KM,
  NEAREST_METRO_CATEGORY,
  NEAREST_METRO_MAX_RADIUS_KM,
} from './poi.constants';

@Injectable()
export class PoiService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async findNearestMetro(
    latitude: number,
    longitude: number,
    city: string,
    region?: string | null,
  ): Promise<NearestMetroResponse> {
    const empty: NearestMetroResponse = {
      station: null,
      distanceMeters: null,
      distanceKm: null,
      approximate: true,
    };
    if (!this.redis.isConfigured) return empty;
    const citySlug = resolveDestinationCitySlug(city, region);
    if (!citySlug) return empty;
    const dataset = METRO_POI_DATASETS.find(
      (entry) => entry.citySlug === citySlug && entry.category === NEAREST_METRO_CATEGORY,
    );
    if (!dataset) return empty;
    const geoKey = buildPoiGeoKey(NEAREST_METRO_CATEGORY, citySlug);
    const metaKey = buildPoiMetaKey(NEAREST_METRO_CATEGORY, citySlug);
    const nearest = await this.redis.geoSearchNearest(
      geoKey,
      longitude,
      latitude,
      NEAREST_METRO_MAX_RADIUS_KM,
      1,
    );
    const hit = nearest[0];
    if (!hit) return empty;
    const stationRecord = dataset.stations.find((station) => station.id === hit.member);
    if (!stationRecord) return empty;
    const labelsRaw = await this.redis.hget(metaKey, hit.member);
    const nameLabels: PoiNameLabels = labelsRaw
      ? (JSON.parse(labelsRaw) as PoiNameLabels)
      : stationRecord.nameLabels;
    const distanceKm = Math.round(hit.distanceKm * 1000) / 1000;
    const distanceMeters = Math.round(hit.distanceKm * 1000);
    return {
      station: {
        id: stationRecord.id,
        nameLabels,
        latitude: stationRecord.latitude,
        longitude: stationRecord.longitude,
      },
      distanceKm,
      distanceMeters,
      approximate: true,
    };
  }

  async findNearbyDestinations(
    latitude: number,
    longitude: number,
    city: string,
    region?: string | null,
  ): Promise<NearbyPoisResponse> {
    const empty: NearbyPoisResponse = { citySlug: null, pois: [] };
    if (!this.redis.isConfigured) return empty;
    const citySlug = resolveDestinationCitySlug(city, region);
    if (!citySlug) return empty;
    const geoKey = buildDestinationGeoKey(citySlug);
    const metaKey = buildDestinationMetaKey(citySlug);
    const hits = await this.redis.geoSearchByRadius(
      geoKey,
      longitude,
      latitude,
      NEARBY_DESTINATIONS_MAX_RADIUS_KM,
      NEARBY_DESTINATIONS_MAX_COUNT,
    );
    const pois: NearbyPoiItem[] = [];
    for (const hit of hits) {
      const metaRaw = await this.redis.hget(metaKey, hit.member);
      if (!metaRaw) continue;
      const parsed = JSON.parse(metaRaw) as PoiDestination;
      const distanceMeters = Math.round(hit.distanceKm * 1000);
      const distanceKm = Math.round(hit.distanceKm * 1000) / 1000;
      pois.push({
        id: parsed.id,
        category: parsed.category,
        nameLabels: parsed.nameLabels,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        distanceMeters,
        distanceKm,
      });
    }
    return { citySlug, pois };
  }

  async findByIds(ids: string[]): Promise<PoiDestination[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.poi.findMany({ where: { id: { in: ids } } });
    const byId = new Map(
      rows.map((row) => [row.id, toPoiDestination(row as unknown as PoiRecord)]),
    );
    return ids.flatMap((id) => {
      const poi = byId.get(id);
      return poi ? [poi] : [];
    });
  }

  async assertFeaturedPoiIds(poiIds: string[] | undefined): Promise<void> {
    if (!poiIds || poiIds.length === 0) return;
    if (poiIds.length > MAX_FEATURED_POIS) {
      throw new BadRequestException(`At most ${MAX_FEATURED_POIS} featured POIs are allowed`);
    }
    const uniqueIds = new Set(poiIds);
    if (uniqueIds.size !== poiIds.length) {
      throw new BadRequestException('Featured POI ids must be unique');
    }
    const found = await this.prisma.poi.findMany({
      where: { id: { in: poiIds }, status: 'PUBLISHED' },
      select: { id: true },
    });
    const catalogIds = new Set(found.map((row) => row.id));
    for (const poiId of poiIds) {
      if (!catalogIds.has(poiId)) {
        throw new BadRequestException(`Unknown featured POI id: ${poiId}`);
      }
    }
  }

  buildFeaturedPois(
    pois: PoiDestination[],
    latitude: number | null,
    longitude: number | null,
  ): {
    id: string;
    sortOrder: number;
    category: string;
    nameLabels: PoiNameLabels;
    latitude: number;
    longitude: number;
    distanceMeters: number;
    distanceKm: number;
  }[] {
    return pois.map((poi, index) => {
      const distanceMeters =
        latitude !== null && longitude !== null
          ? computeDistanceMeters(latitude, longitude, poi.latitude, poi.longitude)
          : 0;
      const distanceKm =
        latitude !== null && longitude !== null
          ? computeDistanceKm(latitude, longitude, poi.latitude, poi.longitude)
          : 0;
      return {
        id: poi.id,
        sortOrder: index + 1,
        category: poi.category,
        nameLabels: poi.nameLabels,
        latitude: poi.latitude,
        longitude: poi.longitude,
        distanceMeters,
        distanceKm,
      };
    });
  }

  async listPlannerCandidates(params: {
    citySlug: string;
    tags: string[];
    limit: number;
  }): Promise<PoiRecord[]> {
    const nearbySlugs =
      params.citySlug === 'yerevan' ? ['yerevan', ...YEREVAN_NEARBY_CITY_SLUGS] : [params.citySlug];
    const rows = await this.prisma.poi.findMany({
      where: {
        status: 'PUBLISHED',
        usableInPlanner: true,
        citySlug: { in: [...nearbySlugs] },
        ...(params.tags.length > 0 ? { tags: { hasSome: params.tags } } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }],
      take: params.limit,
    });
    if (rows.length > 0 || params.tags.length === 0) {
      return rows as unknown as PoiRecord[];
    }
    const fallback = await this.prisma.poi.findMany({
      where: {
        status: 'PUBLISHED',
        usableInPlanner: true,
        citySlug: { in: [...nearbySlugs] },
      },
      orderBy: [{ sortOrder: 'asc' }],
      take: params.limit,
    });
    return fallback as unknown as PoiRecord[];
  }

  async listPublishedCities(): Promise<{ citySlug: string; city: string; region: string }[]> {
    const rows = await this.prisma.poi.findMany({
      where: { status: 'PUBLISHED' },
      distinct: ['citySlug'],
      select: { citySlug: true, city: true, region: true },
      orderBy: { city: 'asc' },
    });
    if (rows.length > 0) return rows;
    return [{ citySlug: 'yerevan', city: 'Yerevan', region: 'Yerevan' }];
  }

  /**
   * Cities the trip planner will generate for: those with enough curated,
   * planner-usable published POIs to build a non-repetitive itinerary.
   */
  async listPlannerCities(): Promise<PoiCityOption[]> {
    const slugs = await this.plannerCitySlugs();
    if (slugs.size === 0) return [];
    const rows = await this.prisma.poi.findMany({
      where: { citySlug: { in: [...slugs] }, status: 'PUBLISHED' },
      distinct: ['citySlug'],
      select: { citySlug: true, city: true, region: true },
      orderBy: { city: 'asc' },
    });
    return rows;
  }

  async isPlannerCity(citySlug: string): Promise<boolean> {
    const slugs = await this.plannerCitySlugs();
    return slugs.has(citySlug);
  }

  private async plannerCitySlugs(): Promise<Set<string>> {
    const minPois = this.config.get('tripPlanner.minCatalogPoisPerCity', { infer: true });
    const grouped = await this.prisma.poi.groupBy({
      by: ['citySlug'],
      where: { status: 'PUBLISHED', usableInPlanner: true },
      _count: { _all: true },
    });
    const slugs = new Set(
      grouped.filter((row) => row._count._all >= minPois).map((row) => row.citySlug),
    );
    if (slugs.has('yerevan')) {
      for (const nearby of YEREVAN_NEARBY_CITY_SLUGS) slugs.delete(nearby);
    }
    return slugs;
  }
}

export { toCoord };
