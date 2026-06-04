import type {
  GeocodingSearchLevel,
  PlaceResult,
  SearchPlacesResponse,
  YandexGeocodingLang,
} from '@repo/shared';

import { api } from '@/lib/api';

export type { PlaceResult };

export async function searchPlaces(
  query: string,
  level: GeocodingSearchLevel = 'any',
  lang?: YandexGeocodingLang,
): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q: query.trim(), level });
  if (lang) params.set('lang', lang);
  const data = await api.get<SearchPlacesResponse>(`/geocoding/search?${params.toString()}`);
  return data.places;
}
