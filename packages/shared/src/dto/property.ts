import type { PropertyType } from '../types/index';

export const CancellationPolicies = ['FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE'] as const;
export type CancellationPolicy = (typeof CancellationPolicies)[number];

export const PhotoMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PhotoMimeType = (typeof PhotoMimeTypes)[number];

export interface CreatePropertyInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  city: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNight: number;
  cancellationPolicy: CancellationPolicy;
  country?: string;
  region?: string;
  street?: string;
  buildingNumber?: string;
  formattedAddress?: string;
  placeKind?: string;
  apartmentNumber?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  maxAdults?: number;
  maxChildren?: number;
  maxInfants?: number;
  currency?: string;
  cleaningFee?: number;
  securityDeposit?: number;
  minNights?: number;
  maxNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  additionalRules?: string;
  externalBookingUrl?: string;
}

export type UpdatePropertyInput = Partial<CreatePropertyInput> & {
  featured?: boolean;
};

export interface AmenityInput {
  name: string;
  category?: string;
  iconKey?: string;
}

export interface ReplaceAmenitiesInput {
  amenities: AmenityInput[];
}

export interface CreatePresignedPhotoUrlInput {
  mimeType: PhotoMimeType;
}

export interface PresignedPhotoUrlResponse {
  uploadUrl: string;
  key: string;
}

export interface ConfirmPhotoUploadInput {
  key: string;
  caption?: string;
  sortOrder?: number;
  isCover?: boolean;
}
