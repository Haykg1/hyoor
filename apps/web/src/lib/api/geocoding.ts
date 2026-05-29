import type { GeocodingSearchLevel, PlaceResult, SearchPlacesResponse } from '@repo/shared';

import { api } from '@/lib/api';

export type { PlaceResult };

export async function searchPlaces(
  query: string,
  level: GeocodingSearchLevel = 'any',
): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q: query.trim(), level });
  const data = await api.get<SearchPlacesResponse>(`/geocoding/search?${params.toString()}`);
  return data.places;
}
