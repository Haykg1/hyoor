import type { PropertyType } from '../types';

export const PROPERTY_SORT_VALUES = ['createdAt', 'pricePerNight'] as const;
export type PropertySortValue = (typeof PROPERTY_SORT_VALUES)[number];

export interface SearchPropertiesQuery {
  featured?: boolean;
  limit?: number;
  page?: number;
  /** Free-text title search across canonical title + titleLabels.* translations. */
  q?: string;
  city?: string;
  country?: string;
  region?: string;
  searchCity?: string;
  searchStreet?: string;
  searchBuildingNumber?: string;
  searchPlaceKind?: string;
  searchLatitude?: number;
  searchLongitude?: number;
  searchRadiusKm?: number;
  propertyType?: PropertyType;
  checkIn?: string;
  checkOut?: string;
  maxGuests?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: PropertySortValue;
  minAdults?: number;
  minChildren?: number;
  minInfants?: number;
  minBedrooms?: number;
  minBeds?: number;
  minBathrooms?: number;
  minCleaningFee?: number;
  maxCleaningFee?: number;
  minSecurityDeposit?: number;
  maxSecurityDeposit?: number;
  minNights?: number;
  maxNights?: number;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  amenities?: string[];
  minAvgRating?: number;
  minReviewCount?: number;
}
