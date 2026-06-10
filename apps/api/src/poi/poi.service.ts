import { Injectable } from '@nestjs/common';
import type {
  NearbyPoiItem,
  NearbyPoisResponse,
  NearestMetroResponse,
  PoiDestination,
  PoiNameLabels,
} from '@repo/shared';
import {
  buildDestinationGeoKey,
  buildDestinationMetaKey,
  buildPoiGeoKey,
  buildPoiMetaKey,
  resolveDestinationCitySlug,
} from '@repo/shared';
import { getDestinationDataset, METRO_POI_DATASETS } from '@repo/shared/data/poi-datasets';

import { RedisService } from '../redis/redis.service';

import {
  NEARBY_DESTINATIONS_MAX_COUNT,
  NEARBY_DESTINATIONS_MAX_RADIUS_KM,
  NEAREST_METRO_CATEGORY,
  NEAREST_METRO_MAX_RADIUS_KM,
} from './poi.constants';

@Injectable()
export class PoiService {
  constructor(private readonly redis: RedisService) {}

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
    const dataset = getDestinationDataset(citySlug);
    if (!dataset || dataset.destinations.length === 0) {
      return { citySlug, pois: [] };
    }
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
      const destination = dataset.destinations.find((entry) => entry.id === hit.member);
      if (!destination) continue;
      const metaRaw = await this.redis.hget(metaKey, hit.member);
      const parsed = metaRaw ? (JSON.parse(metaRaw) as PoiDestination) : destination;
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
}
