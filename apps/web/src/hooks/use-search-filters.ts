import {
  PROPERTY_SORT_VALUES,
  type ListPropertiesParams,
  type PropertySortValue,
} from '@/lib/api/properties';

export interface SearchFilters {
  location: string;
  region: string;
  searchCity?: string;
  searchStreet?: string;
  searchBuildingNumber?: string;
  searchPlaceKind?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  sortBy: PropertySortValue;
  minBedrooms?: number;
  minBeds?: number;
  minBathrooms?: number;
  minAdults?: number;
  minChildren?: number;
  minInfants?: number;
  minCleaningFee?: number;
  maxCleaningFee?: number;
  minSecurityDeposit?: number;
  maxSecurityDeposit?: number;
  minNights?: number;
  maxNights?: number;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  amenities: string[];
  minAvgRating?: number;
  minReviewCount?: number;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  location: '',
  region: '',
  checkIn: '',
  checkOut: '',
  guests: 1,
  sortBy: 'createdAt',
  amenities: [],
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function readString(raw: RawSearchParams, key: string): string {
  const value = raw[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function readSort(raw: RawSearchParams): PropertySortValue {
  const value = readString(raw, 'sortBy');
  return (PROPERTY_SORT_VALUES as readonly string[]).includes(value)
    ? (value as PropertySortValue)
    : 'createdAt';
}

function readGuests(raw: RawSearchParams): number {
  const value = readString(raw, 'guests');
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readOptionalInt(raw: RawSearchParams, key: string): number | undefined {
  const value = readString(raw, key);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Fee/deposit inputs use empty = unset; `0` in the URL is treated as unset. */
function readOptionalFeeInt(raw: RawSearchParams, key: string): number | undefined {
  const parsed = readOptionalInt(raw, key);
  if (parsed === 0) return undefined;
  return parsed;
}

function omitUnsetFeeValue(value: number | undefined): number | undefined {
  if (value === undefined || value === 0) return undefined;
  return value;
}

function readOptionalFloat(raw: RawSearchParams, key: string): number | undefined {
  const value = readString(raw, key);
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readOptionalBool(raw: RawSearchParams, key: string): boolean | undefined {
  const value = raw[key];
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  return undefined;
}

function readStringArray(raw: RawSearchParams, key: string): string[] {
  const value = raw[key];
  if (Array.isArray(value)) return value.map(String).filter((v) => v.trim().length > 0);
  if (typeof value === 'string') return value.trim() ? [value] : [];
  return [];
}

/**
 * Parses the Next.js searchParams object into our typed SearchFilters.
 * Pure function — safe to call from server components.
 */
export function parseSearchFilters(raw: RawSearchParams): SearchFilters {
  return {
    location: readString(raw, 'location'),
    region: readString(raw, 'region'),
    searchCity: readString(raw, 'searchCity') || undefined,
    searchStreet: readString(raw, 'searchStreet') || undefined,
    searchBuildingNumber: readString(raw, 'searchBuildingNumber') || undefined,
    searchPlaceKind: readString(raw, 'searchPlaceKind') || undefined,
    checkIn: readString(raw, 'checkIn'),
    checkOut: readString(raw, 'checkOut'),
    guests: readGuests(raw),
    sortBy: readSort(raw),
    minBedrooms: readOptionalInt(raw, 'minBedrooms'),
    minBeds: readOptionalInt(raw, 'minBeds'),
    minBathrooms: readOptionalFloat(raw, 'minBathrooms'),
    minAdults: readOptionalInt(raw, 'minAdults'),
    minChildren: readOptionalInt(raw, 'minChildren'),
    minInfants: readOptionalInt(raw, 'minInfants'),
    minCleaningFee: readOptionalFeeInt(raw, 'minCleaningFee'),
    maxCleaningFee: readOptionalFeeInt(raw, 'maxCleaningFee'),
    minSecurityDeposit: readOptionalFeeInt(raw, 'minSecurityDeposit'),
    maxSecurityDeposit: readOptionalFeeInt(raw, 'maxSecurityDeposit'),
    minNights: readOptionalInt(raw, 'minNights'),
    maxNights: readOptionalInt(raw, 'maxNights'),
    smokingAllowed: readOptionalBool(raw, 'smokingAllowed'),
    petsAllowed: readOptionalBool(raw, 'petsAllowed'),
    partiesAllowed: readOptionalBool(raw, 'partiesAllowed'),
    amenities: readStringArray(raw, 'amenities'),
    minAvgRating: readOptionalFloat(raw, 'minAvgRating'),
    minReviewCount: readOptionalInt(raw, 'minReviewCount'),
  };
}

function buildLocationApiParams(
  filters: SearchFilters,
): Pick<
  ListPropertiesParams,
  'city' | 'region' | 'searchCity' | 'searchStreet' | 'searchBuildingNumber' | 'searchPlaceKind'
> {
  if (filters.searchPlaceKind === 'house' && filters.searchStreet && filters.searchBuildingNumber) {
    return {
      region: filters.region || undefined,
      searchCity: filters.searchCity,
      searchStreet: filters.searchStreet,
      searchBuildingNumber: filters.searchBuildingNumber,
      searchPlaceKind: filters.searchPlaceKind,
    };
  }
  if (filters.searchCity) {
    return {
      region: filters.region || undefined,
      searchCity: filters.searchCity,
      searchPlaceKind: filters.searchPlaceKind,
    };
  }
  return {
    city: filters.location || undefined,
    region: filters.region || undefined,
  };
}

/** Maps our typed UI filters onto the API request shape. */
export function filtersToApiParams(filters: SearchFilters): Omit<ListPropertiesParams, 'featured'> {
  return {
    ...buildLocationApiParams(filters),
    checkIn: filters.checkIn || undefined,
    checkOut: filters.checkOut || undefined,
    maxGuests: filters.guests > 1 ? filters.guests : undefined,
    sortBy: filters.sortBy,
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

export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    Boolean(filters.location) ||
    Boolean(filters.region) ||
    Boolean(filters.searchCity) ||
    Boolean(filters.searchStreet) ||
    Boolean(filters.searchBuildingNumber) ||
    Boolean(filters.searchPlaceKind) ||
    Boolean(filters.checkIn) ||
    Boolean(filters.checkOut) ||
    filters.guests > 1 ||
    (filters.amenities?.length ?? 0) > 0 ||
    filters.minBedrooms !== undefined ||
    filters.minBeds !== undefined ||
    filters.minBathrooms !== undefined ||
    filters.minAdults !== undefined ||
    filters.minChildren !== undefined ||
    filters.minInfants !== undefined ||
    filters.minCleaningFee !== undefined ||
    filters.maxCleaningFee !== undefined ||
    filters.minSecurityDeposit !== undefined ||
    filters.maxSecurityDeposit !== undefined ||
    filters.minNights !== undefined ||
    filters.maxNights !== undefined ||
    filters.smokingAllowed !== undefined ||
    filters.petsAllowed !== undefined ||
    filters.partiesAllowed !== undefined ||
    filters.minAvgRating !== undefined ||
    filters.minReviewCount !== undefined
  );
}
