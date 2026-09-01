import type { NearbyPoisResponse, NearestMetroResponse, PoiCityOption } from '@repo/shared';

import { api } from '@/lib/api';

export interface FetchPoiLocationInput {
  latitude: number;
  longitude: number;
  city: string;
  region?: string | null;
}

const nearestMetroInflight = new Map<string, Promise<NearestMetroResponse>>();
const nearbyDestinationsInflight = new Map<string, Promise<NearbyPoisResponse>>();

export async function fetchNearestMetro(
  input: FetchPoiLocationInput,
): Promise<NearestMetroResponse> {
  const key = poiCacheKey(input);
  const existing = nearestMetroInflight.get(key);
  if (existing) return existing;
  const params = buildPoiQueryParams(input);
  const request = api
    .get<NearestMetroResponse>(`/poi/nearest-metro?${params.toString()}`)
    .finally(() => {
      nearestMetroInflight.delete(key);
    });
  nearestMetroInflight.set(key, request);
  return request;
}

export async function fetchNearbyDestinations(
  input: FetchPoiLocationInput,
): Promise<NearbyPoisResponse> {
  const key = poiCacheKey(input);
  const existing = nearbyDestinationsInflight.get(key);
  if (existing) return existing;
  const params = buildPoiQueryParams(input);
  const request = api
    .get<NearbyPoisResponse>(`/poi/nearby-destinations?${params.toString()}`)
    .finally(() => {
      nearbyDestinationsInflight.delete(key);
    });
  nearbyDestinationsInflight.set(key, request);
  return request;
}

export async function listPoiCities(): Promise<PoiCityOption[]> {
  return api.get<PoiCityOption[]>('/poi/cities');
}

export async function listPlannerCities(): Promise<PoiCityOption[]> {
  return api.get<PoiCityOption[]>('/poi/planner-cities');
}

function poiCacheKey(input: FetchPoiLocationInput): string {
  return [
    input.latitude,
    input.longitude,
    input.city.trim().toLowerCase(),
    input.region?.trim().toLowerCase() ?? '',
  ].join('|');
}

function buildPoiQueryParams(input: FetchPoiLocationInput): URLSearchParams {
  const params = new URLSearchParams({
    latitude: String(input.latitude),
    longitude: String(input.longitude),
    city: input.city,
  });
  if (input.region?.trim()) {
    params.set('region', input.region.trim());
  }
  return params;
}
