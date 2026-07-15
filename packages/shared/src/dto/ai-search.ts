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
  stayNights?: number;
  availableFrom?: string;
  availableTo?: string;
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

export interface AiSearchPropertyResult extends PropertySummary {
  suggestedCheckIn?: string;
  suggestedCheckOut?: string;
}

export type AiSearchResponseType = 'clarify' | 'search';

export interface AiSearchChatResponse {
  type: AiSearchResponseType;
  message: string;
  filters?: AiSearchExtractedFilters;
  properties?: AiSearchPropertyResult[];
  searchPath?: string;
  /** True when the model called search without required location+dates; partial filters still applied. */
  inefficientPrompt?: boolean;
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
  stayNights?: number;
  availableFrom?: string;
  availableTo?: string;
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
