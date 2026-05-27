import {
  PROPERTY_SORT_VALUES,
  type ListPropertiesParams,
  type PropertySortValue,
} from '@/lib/api/properties';

export interface SearchFilters {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  sortBy: PropertySortValue;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  location: '',
  checkIn: '',
  checkOut: '',
  guests: 1,
  sortBy: 'createdAt',
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

/**
 * Parses the Next.js searchParams object into our typed SearchFilters.
 * Pure function — safe to call from server components.
 */
export function parseSearchFilters(raw: RawSearchParams): SearchFilters {
  return {
    location: readString(raw, 'location'),
    checkIn: readString(raw, 'checkIn'),
    checkOut: readString(raw, 'checkOut'),
    guests: readGuests(raw),
    sortBy: readSort(raw),
  };
}

/** Maps our typed UI filters onto the API request shape. */
export function filtersToApiParams(filters: SearchFilters): Omit<ListPropertiesParams, 'featured'> {
  return {
    city: filters.location || undefined,
    checkIn: filters.checkIn || undefined,
    checkOut: filters.checkOut || undefined,
    maxGuests: filters.guests > 1 ? filters.guests : undefined,
    sortBy: filters.sortBy,
  };
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    Boolean(filters.location) ||
    Boolean(filters.checkIn) ||
    Boolean(filters.checkOut) ||
    filters.guests > 1
  );
}
