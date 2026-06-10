import type { ListFavoritesQuery, PaginatedResponse, PropertySummary } from '@repo/shared';

import { api } from '@/lib/api';

function setOptionalNumber(query: URLSearchParams, key: string, value: number | undefined): void {
  if (value !== undefined) query.set(key, String(value));
}

export async function listFavoriteIds(): Promise<string[]> {
  return api.get<string[]>('/favorites/ids');
}

export async function listFavorites(
  params: ListFavoritesQuery = {},
): Promise<PaginatedResponse<PropertySummary>> {
  const query = new URLSearchParams();
  setOptionalNumber(query, 'page', params.page);
  setOptionalNumber(query, 'limit', params.limit);
  if (params.q) query.set('q', params.q);
  if (params.city) query.set('city', params.city);
  for (const city of params.cities ?? []) {
    const trimmed = city.trim();
    if (trimmed) query.append('cities', trimmed);
  }
  if (params.country) query.set('country', params.country);
  if (params.region) query.set('region', params.region);
  for (const region of params.regions ?? []) {
    const trimmed = region.trim();
    if (trimmed) query.append('regions', trimmed);
  }
  if (params.propertyType) query.set('propertyType', params.propertyType);
  setOptionalNumber(query, 'minPrice', params.minPrice);
  setOptionalNumber(query, 'maxPrice', params.maxPrice);
  setOptionalNumber(query, 'maxGuests', params.maxGuests);
  setOptionalNumber(query, 'minBedrooms', params.minBedrooms);
  setOptionalNumber(query, 'minBeds', params.minBeds);
  setOptionalNumber(query, 'minBathrooms', params.minBathrooms);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const qs = query.toString();
  return api.get<PaginatedResponse<PropertySummary>>(`/favorites${qs ? `?${qs}` : ''}`);
}

export async function addFavorite(propertyId: string): Promise<{ propertyId: string }> {
  return api.post<{ propertyId: string }>(`/favorites/${propertyId}`);
}

export async function removeFavorite(propertyId: string): Promise<void> {
  await api.delete(`/favorites/${propertyId}`);
}
