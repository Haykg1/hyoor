import type { AiSearchExtractedFilters, SearchPropertiesToolArgs } from '@repo/shared';
import type { PlaceResult } from '@repo/shared';
import { resolveAiSearchDateFields, todayIsoUtc } from '@repo/shared';

import { SearchPropertiesDto } from '../../properties/dto/search-properties.dto';

export interface ResolvedLocation {
  locationLabel: string;
  searchCity?: string;
  searchStreet?: string;
  searchBuildingNumber?: string;
  searchPlaceKind?: string;
  searchLatitude?: number;
  searchLongitude?: number;
  region?: string;
  city?: string;
}

export function placeToResolvedLocation(place: PlaceResult): ResolvedLocation {
  const city = place.city ?? place.name;
  return {
    locationLabel: place.formattedAddress || place.fullName || place.name,
    searchCity: city ?? undefined,
    searchStreet: place.street ?? undefined,
    searchBuildingNumber: place.buildingNumber ?? undefined,
    searchPlaceKind: place.placeKind ?? undefined,
    searchLatitude: place.lat,
    searchLongitude: place.lng,
    region: place.region ?? undefined,
    city: city ?? undefined,
  };
}

export function fallbackResolvedLocation(locationQuery: string): ResolvedLocation {
  const trimmed = locationQuery.trim();
  return {
    locationLabel: trimmed,
    searchCity: trimmed,
    city: trimmed,
  };
}

function setOptionalNumber(query: URLSearchParams, key: string, value: number | undefined): void {
  if (value !== undefined) query.set(key, String(value));
}

function setOptionalBoolean(query: URLSearchParams, key: string, value: boolean | undefined): void {
  if (value !== undefined) query.set(key, String(value));
}

export function buildSearchPathFromFilters(
  filters: AiSearchExtractedFilters,
  suggestedDates?: { checkIn: string; checkOut: string },
): string {
  const today = todayIsoUtc();
  const sanitized = resolveAiSearchDateFields(
    {
      checkIn: suggestedDates?.checkIn ?? filters.checkIn,
      checkOut: suggestedDates?.checkOut ?? filters.checkOut,
      stayNights: filters.stayNights,
      availableFrom: filters.availableFrom,
      availableTo: filters.availableTo,
    },
    today,
  );
  const query = new URLSearchParams();
  if (filters.searchCity) query.set('searchCity', filters.searchCity);
  if (filters.region) query.set('region', filters.region);
  if (filters.searchStreet) query.set('searchStreet', filters.searchStreet);
  if (filters.searchBuildingNumber) query.set('searchBuildingNumber', filters.searchBuildingNumber);
  if (filters.searchPlaceKind) query.set('searchPlaceKind', filters.searchPlaceKind);
  setOptionalNumber(query, 'searchLatitude', filters.searchLatitude);
  setOptionalNumber(query, 'searchLongitude', filters.searchLongitude);
  if (sanitized.checkIn) query.set('checkIn', sanitized.checkIn);
  if (sanitized.checkOut) query.set('checkOut', sanitized.checkOut);
  if (filters.guests && filters.guests > 1) query.set('guests', String(filters.guests));
  setOptionalNumber(query, 'minBedrooms', filters.minBedrooms);
  setOptionalNumber(query, 'minBeds', filters.minBeds);
  setOptionalNumber(query, 'minBathrooms', filters.minBathrooms);
  setOptionalNumber(query, 'minPrice', filters.minPrice);
  setOptionalNumber(query, 'maxPrice', filters.maxPrice);
  if (filters.propertyType) query.set('propertyType', filters.propertyType);
  setOptionalBoolean(query, 'petsAllowed', filters.petsAllowed);
  setOptionalBoolean(query, 'smokingAllowed', filters.smokingAllowed);
  setOptionalBoolean(query, 'partiesAllowed', filters.partiesAllowed);
  setOptionalNumber(query, 'minAvgRating', filters.minAvgRating);
  if (filters.q) query.set('q', filters.q);
  for (const amenity of filters.amenities ?? []) {
    const trimmed = amenity.trim();
    if (trimmed) query.append('amenities', trimmed);
  }
  const qs = query.toString();
  return qs ? `/search?${qs}` : '/search';
}

export function toExtractedFilters(
  args: SearchPropertiesToolArgs,
  location: ResolvedLocation,
): AiSearchExtractedFilters {
  const dates = resolveAiSearchDateFields(args, todayIsoUtc());
  return {
    locationLabel: location.locationLabel,
    searchCity: location.searchCity,
    searchStreet: location.searchStreet,
    searchBuildingNumber: location.searchBuildingNumber,
    searchPlaceKind: location.searchPlaceKind,
    searchLatitude: location.searchLatitude,
    searchLongitude: location.searchLongitude,
    region: location.region,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    stayNights: dates.stayNights,
    availableFrom: dates.availableFrom,
    availableTo: dates.availableTo,
    guests: args.maxGuests,
    minBedrooms: args.minBedrooms,
    minBeds: args.minBeds,
    minBathrooms: args.minBathrooms,
    minPrice: args.minPrice,
    maxPrice: args.maxPrice,
    propertyType: args.propertyType,
    amenities: args.amenities,
    petsAllowed: args.petsAllowed,
    smokingAllowed: args.smokingAllowed,
    partiesAllowed: args.partiesAllowed,
    minAvgRating: args.minAvgRating,
    q: args.q,
  };
}

export function hasExactSearchDates(args: SearchPropertiesToolArgs): boolean {
  return Boolean(args.checkIn?.trim() && args.checkOut?.trim());
}

export function hasFlexibleSearchDates(args: SearchPropertiesToolArgs): boolean {
  return (
    args.stayNights !== undefined &&
    args.stayNights >= 1 &&
    Boolean(args.availableFrom?.trim() && args.availableTo?.trim())
  );
}

export function toSearchPropertiesDto(
  args: SearchPropertiesToolArgs,
  location: ResolvedLocation,
): SearchPropertiesDto {
  const dates = resolveAiSearchDateFields(args, todayIsoUtc());
  const dto = new SearchPropertiesDto();
  dto.searchCity = location.searchCity;
  dto.searchStreet = location.searchStreet;
  dto.searchBuildingNumber = location.searchBuildingNumber;
  dto.searchPlaceKind = location.searchPlaceKind;
  dto.searchLatitude = location.searchLatitude;
  dto.searchLongitude = location.searchLongitude;
  dto.region = location.region;
  dto.city = location.city;
  if (hasExactSearchDates(dates)) {
    dto.checkIn = dates.checkIn;
    dto.checkOut = dates.checkOut;
  } else if (hasFlexibleSearchDates(dates)) {
    dto.stayNights = dates.stayNights;
    dto.availableFrom = dates.availableFrom;
    dto.availableTo = dates.availableTo;
    dto.minNights = dates.stayNights;
    dto.maxNights = dates.stayNights;
  }
  dto.maxGuests = args.maxGuests;
  dto.minBedrooms = args.minBedrooms;
  dto.minBeds = args.minBeds;
  dto.minBathrooms = args.minBathrooms;
  dto.minPrice = args.minPrice;
  dto.maxPrice = args.maxPrice;
  dto.propertyType = args.propertyType;
  dto.amenities = args.amenities;
  dto.petsAllowed = args.petsAllowed;
  dto.smokingAllowed = args.smokingAllowed;
  dto.partiesAllowed = args.partiesAllowed;
  dto.minAvgRating = args.minAvgRating;
  dto.q = args.q;
  dto.limit = 8;
  dto.page = 1;
  return dto;
}

export function hasRequiredSearchFields(args: SearchPropertiesToolArgs): boolean {
  const hasLocation = Boolean(args.locationQuery?.trim());
  const hasDates = hasExactSearchDates(args) || hasFlexibleSearchDates(args);
  return hasLocation && hasDates;
}
