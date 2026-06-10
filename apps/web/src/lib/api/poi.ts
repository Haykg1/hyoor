import type { NearbyPoisResponse, NearestMetroResponse } from '@repo/shared';

import { api } from '@/lib/api';

export interface FetchPoiLocationInput {
  latitude: number;
  longitude: number;
  city: string;
  region?: string | null;
}

export async function fetchNearestMetro(
  input: FetchPoiLocationInput,
): Promise<NearestMetroResponse> {
  const params = buildPoiQueryParams(input);
  return api.get<NearestMetroResponse>(`/poi/nearest-metro?${params.toString()}`);
}

export async function fetchNearbyDestinations(
  input: FetchPoiLocationInput,
): Promise<NearbyPoisResponse> {
  const params = buildPoiQueryParams(input);
  return api.get<NearbyPoisResponse>(`/poi/nearby-destinations?${params.toString()}`);
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
