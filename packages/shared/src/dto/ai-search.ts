import type { PropertySummary } from '../types/index';
import type { PropertyType } from '../types/index';

export type AiSearchMessageRole = 'user' | 'assistant';

export interface AiSearchMessage {
  role: AiSearchMessageRole;
  content: string;
}

export interface AiSearchChatRequest {
  messages: AiSearchMessage[];
  locale?: string;
}

export interface AiSearchExtractedFilters {
  locationLabel?: string;
  searchCity?: string;
  searchStreet?: string;
  searchBuildingNumber?: string;
  searchPlaceKind?: string;
  searchLatitude?: number;
  searchLongitude?: number;
  region?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minBedrooms?: number;
  minBeds?: number;
  minBathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType;
  amenities?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  partiesAllowed?: boolean;
  minAvgRating?: number;
  q?: string;
}

export type AiSearchResponseType = 'clarify' | 'search';

export interface AiSearchChatResponse {
  type: AiSearchResponseType;
  message: string;
  filters?: AiSearchExtractedFilters;
  properties?: PropertySummary[];
  searchPath?: string;
  quota?: AiSearchQuota;
}

export interface AiSearchQuota {
  limit: number;
  used: number;
  remaining: number;
  isAuthenticated: boolean;
  isVerifiedProfile?: boolean;
  resetsInSeconds?: number;
  tokenLimit?: number;
  tokensUsed?: number;
  tokensRemaining?: number;
}

export interface SearchPropertiesToolArgs {
  locationQuery?: string;
  checkIn?: string;
  checkOut?: string;
  maxGuests?: number;
  minBedrooms?: number;
  minBeds?: number;
  minBathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType;
  amenities?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  partiesAllowed?: boolean;
  minAvgRating?: number;
  q?: string;
}
