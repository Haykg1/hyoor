import type { PlaceResult } from '@repo/shared';

import type { SearchFilters } from '@/hooks/use-search-filters';

/** Subset of search filters set by selecting a geocoded place. */
export type LocationFilters = Pick<
  SearchFilters,
  | 'location'
  | 'region'
  | 'searchCity'
  | 'searchStreet'
  | 'searchBuildingNumber'
  | 'searchPlaceKind'
  | 'searchLatitude'
  | 'searchLongitude'
>;

/**
 * Maps a geocoded place into the location subset of search filters.
 *
 * Coordinates are forwarded for every kind so the API can run a geo radius
 * around the picked centroid — this is locale-agnostic and avoids brittle
 * text matching across `en`/`hy`/`ru` (e.g. Yerevan vs Ереван vs Երևան).
 * Street/building are only carried for `house` so exact-address matching
 * still works when the user picked a specific dwelling.
 */
export function placeResultToLocationFilters(place: PlaceResult): LocationFilters {
  const display = place.formattedAddress || place.name;
  const hasCoords = Number.isFinite(place.lat) && Number.isFinite(place.lng);
  const base: LocationFilters = {
    location: display,
    region: place.region ?? '',
    searchCity: place.city ?? undefined,
    searchPlaceKind: place.placeKind,
    searchStreet: undefined,
    searchBuildingNumber: undefined,
    searchLatitude: hasCoords ? place.lat : undefined,
    searchLongitude: hasCoords ? place.lng : undefined,
  };
  if (place.placeKind === 'house' && place.street && place.buildingNumber) {
    return {
      ...base,
      searchStreet: place.street,
      searchBuildingNumber: place.buildingNumber,
    };
  }
  return base;
}

/**
 * Reads structured location filters from a hydrated SearchFilters bag.
 * Returns null when there's nothing structured (only legacy `location` free-text).
 */
export function filtersToLocationFilters(filters: SearchFilters): LocationFilters | null {
  const hasStructured = Boolean(
    filters.searchCity ||
    filters.searchPlaceKind ||
    filters.searchStreet ||
    filters.searchBuildingNumber ||
    filters.searchLatitude !== undefined ||
    filters.searchLongitude !== undefined,
  );
  if (!hasStructured) return null;
  return {
    location: filters.location,
    region: filters.region,
    searchCity: filters.searchCity,
    searchStreet: filters.searchStreet,
    searchBuildingNumber: filters.searchBuildingNumber,
    searchPlaceKind: filters.searchPlaceKind,
    searchLatitude: filters.searchLatitude,
    searchLongitude: filters.searchLongitude,
  };
}
