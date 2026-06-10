import type { PropertyType } from '../types';

export const FAVORITE_SORT_VALUES = ['favoritedAt', 'pricePerNight'] as const;
export type FavoriteSortValue = (typeof FAVORITE_SORT_VALUES)[number];

export const FAVORITE_SORT_ORDERS = ['asc', 'desc'] as const;
export type FavoriteSortOrder = (typeof FAVORITE_SORT_ORDERS)[number];

export interface ListFavoritesQuery {
  page?: number;
  limit?: number;
  q?: string;
  city?: string;
  cities?: string[];
  country?: string;
  region?: string;
  regions?: string[];
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  maxGuests?: number;
  minBedrooms?: number;
  minBeds?: number;
  minBathrooms?: number;
  sortBy?: FavoriteSortValue;
  sortOrder?: FavoriteSortOrder;
}
