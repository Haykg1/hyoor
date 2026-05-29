'use client';

import { useCallback } from 'react';

import type { SearchFilters } from '@/hooks/use-search-filters';
import { useRouter } from '@/i18n/navigation';

export type SearchNavigationParams = Partial<
  Pick<
    SearchFilters,
    | 'location'
    | 'region'
    | 'searchCity'
    | 'searchStreet'
    | 'searchBuildingNumber'
    | 'searchPlaceKind'
    | 'checkIn'
    | 'checkOut'
    | 'guests'
    | 'sortBy'
    | 'minBedrooms'
    | 'minBeds'
    | 'minBathrooms'
    | 'minAdults'
    | 'minChildren'
    | 'minInfants'
    | 'minCleaningFee'
    | 'maxCleaningFee'
    | 'minSecurityDeposit'
    | 'maxSecurityDeposit'
    | 'minNights'
    | 'maxNights'
    | 'smokingAllowed'
    | 'petsAllowed'
    | 'partiesAllowed'
    | 'amenities'
    | 'minAvgRating'
    | 'minReviewCount'
  >
>;

function setOptionalNumber(query: URLSearchParams, key: string, value: number | undefined): void {
  if (value !== undefined) query.set(key, String(value));
}

function omitUnsetFeeValue(value: number | undefined): number | undefined {
  if (value === undefined || value === 0) return undefined;
  return value;
}

/** Builds URL query params from filters, omitting defaults and untouched fee fields (0). */
export function searchFiltersToNavigationParams(filters: SearchFilters): SearchNavigationParams {
  return {
    location: filters.location.trim() || undefined,
    region: filters.region.trim() || undefined,
    searchCity: filters.searchCity?.trim() || undefined,
    searchStreet: filters.searchStreet?.trim() || undefined,
    searchBuildingNumber: filters.searchBuildingNumber?.trim() || undefined,
    searchPlaceKind: filters.searchPlaceKind?.trim() || undefined,
    checkIn: filters.checkIn || undefined,
    checkOut: filters.checkOut || undefined,
    guests: filters.guests > 1 ? filters.guests : undefined,
    sortBy: filters.sortBy !== 'createdAt' ? filters.sortBy : undefined,
    minBedrooms: filters.minBedrooms,
    minBeds: filters.minBeds,
    minBathrooms: filters.minBathrooms,
    minAdults: filters.minAdults,
    minChildren: filters.minChildren,
    minInfants: filters.minInfants,
    minCleaningFee: omitUnsetFeeValue(filters.minCleaningFee),
    maxCleaningFee: omitUnsetFeeValue(filters.maxCleaningFee),
    minSecurityDeposit: omitUnsetFeeValue(filters.minSecurityDeposit),
    maxSecurityDeposit: omitUnsetFeeValue(filters.maxSecurityDeposit),
    minNights: filters.minNights,
    maxNights: filters.maxNights,
    smokingAllowed: filters.smokingAllowed,
    petsAllowed: filters.petsAllowed,
    partiesAllowed: filters.partiesAllowed,
    amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
    minAvgRating: filters.minAvgRating,
    minReviewCount: filters.minReviewCount,
  };
}

function setOptionalBoolean(query: URLSearchParams, key: string, value: boolean | undefined): void {
  if (value !== undefined) query.set(key, String(value));
}

export function buildSearchQueryString(params?: SearchNavigationParams): string {
  const query = new URLSearchParams();
  const location = params?.location?.trim();
  if (location) query.set('location', location);
  const region = params?.region?.trim();
  if (region) query.set('region', region);
  const searchCity = params?.searchCity?.trim();
  if (searchCity) query.set('searchCity', searchCity);
  const searchStreet = params?.searchStreet?.trim();
  if (searchStreet) query.set('searchStreet', searchStreet);
  const searchBuildingNumber = params?.searchBuildingNumber?.trim();
  if (searchBuildingNumber) query.set('searchBuildingNumber', searchBuildingNumber);
  const searchPlaceKind = params?.searchPlaceKind?.trim();
  if (searchPlaceKind) query.set('searchPlaceKind', searchPlaceKind);
  if (params?.checkIn) query.set('checkIn', params.checkIn);
  if (params?.checkOut) query.set('checkOut', params.checkOut);
  if (params?.guests && params.guests > 1) query.set('guests', String(params.guests));
  if (params?.sortBy && params.sortBy !== 'createdAt') query.set('sortBy', params.sortBy);
  setOptionalNumber(query, 'minBedrooms', params?.minBedrooms);
  setOptionalNumber(query, 'minBeds', params?.minBeds);
  setOptionalNumber(query, 'minBathrooms', params?.minBathrooms);
  setOptionalNumber(query, 'minAdults', params?.minAdults);
  setOptionalNumber(query, 'minChildren', params?.minChildren);
  setOptionalNumber(query, 'minInfants', params?.minInfants);
  setOptionalNumber(query, 'minCleaningFee', params?.minCleaningFee);
  setOptionalNumber(query, 'maxCleaningFee', params?.maxCleaningFee);
  setOptionalNumber(query, 'minSecurityDeposit', params?.minSecurityDeposit);
  setOptionalNumber(query, 'maxSecurityDeposit', params?.maxSecurityDeposit);
  setOptionalNumber(query, 'minNights', params?.minNights);
  setOptionalNumber(query, 'maxNights', params?.maxNights);
  setOptionalBoolean(query, 'smokingAllowed', params?.smokingAllowed);
  setOptionalBoolean(query, 'petsAllowed', params?.petsAllowed);
  setOptionalBoolean(query, 'partiesAllowed', params?.partiesAllowed);
  for (const amenity of params?.amenities ?? []) {
    const trimmed = amenity.trim();
    if (trimmed) query.append('amenities', trimmed);
  }
  setOptionalNumber(query, 'minAvgRating', params?.minAvgRating);
  setOptionalNumber(query, 'minReviewCount', params?.minReviewCount);
  return query.toString();
}

interface SearchNavigation {
  goToSearch: (params?: SearchNavigationParams) => void;
}

/**
 * Centralizes building the /search URL so callers don't reinvent query-string
 * assembly. Trims empty values and omits defaults to keep the URL clean.
 */
export function useSearchNavigation(): SearchNavigation {
  const router = useRouter();
  const goToSearch = useCallback(
    (params?: SearchNavigationParams) => {
      const qs = buildSearchQueryString(params);
      router.push(qs ? `/search?${qs}` : '/search');
    },
    [router],
  );
  return { goToSearch };
}
