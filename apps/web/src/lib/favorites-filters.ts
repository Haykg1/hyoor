import type { FavoritesFilterState } from '@/components/favorites/favorites-toolbar';

const DEFAULT_SORT_BY = 'favoritedAt';
const DEFAULT_SORT_ORDER = 'desc';

export function countAdvancedFilters(filters: FavoritesFilterState): number {
  let count = 0;
  if (filters.regions.length > 0) count += 1;
  if (filters.cities.length > 0) count += 1;
  if (filters.propertyType) count += 1;
  if (filters.minPrice) count += 1;
  if (filters.maxPrice) count += 1;
  if (filters.maxGuests) count += 1;
  if (filters.minBedrooms) count += 1;
  if (filters.sortBy !== DEFAULT_SORT_BY || filters.sortOrder !== DEFAULT_SORT_ORDER) {
    count += 1;
  }
  return count;
}

export function countAllAppliedFilters(filters: FavoritesFilterState): number {
  let count = countAdvancedFilters(filters);
  if (filters.q.trim()) count += 1;
  return count;
}

export function hasAnyFilterValue(filters: FavoritesFilterState): boolean {
  return countAllAppliedFilters(filters) > 0;
}
