import type {
  AmenityInput,
  ConfirmPhotoUploadInput,
  CreatePresignedPhotoUrlInput,
  CreatePropertyInput,
  HostListingTab,
  HostListingsResponse,
  PaginatedResponse,
  PresignedPhotoUrlResponse,
  PropertyDetail,
  PropertySummary,
  PropertyType,
  UpdatePropertyInput,
} from '@repo/shared';
import type { PhotoMimeType } from '@repo/shared';

import { api } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const ALLOWED_PHOTO_MIME_TYPES: PhotoMimeType[] = ['image/jpeg', 'image/png', 'image/webp'];

const FILTERABLE_CATEGORIES = ['apartment', 'house', 'villa', 'guesthouse'] as const;
export type PropertyCategory = (typeof FILTERABLE_CATEGORIES)[number];
export const PROPERTY_CATEGORIES: readonly PropertyCategory[] = FILTERABLE_CATEGORIES;

const PROPERTY_TYPE_TO_CATEGORY: Record<PropertyType, PropertyCategory | null> = {
  APARTMENT: 'apartment',
  STUDIO: 'apartment',
  HOUSE: 'house',
  VILLA: 'villa',
  GUESTHOUSE: 'guesthouse',
  HOTEL_ROOM: null,
  OTHER: null,
};

export function categoryFromPropertyType(type: PropertyType): PropertyCategory | null {
  return PROPERTY_TYPE_TO_CATEGORY[type];
}

export const PROPERTY_SORT_VALUES = ['createdAt', 'pricePerNight'] as const;
export type PropertySortValue = (typeof PROPERTY_SORT_VALUES)[number];

export interface ListPropertiesParams {
  featured?: boolean;
  limit?: number;
  page?: number;
  city?: string;
  propertyType?: PropertyType;
  checkIn?: string;
  checkOut?: string;
  maxGuests?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: PropertySortValue;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function listProperties(
  params: ListPropertiesParams = {},
): Promise<PaginatedResponse<PropertySummary>> {
  const query = new URLSearchParams();
  if (params.featured !== undefined) query.set('featured', String(params.featured));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.city) query.set('city', params.city);
  if (params.propertyType) query.set('propertyType', params.propertyType);
  if (params.checkIn) query.set('checkIn', params.checkIn);
  if (params.checkOut) query.set('checkOut', params.checkOut);
  if (params.maxGuests !== undefined) query.set('maxGuests', String(params.maxGuests));
  if (params.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  const url = `${BASE_URL}/properties${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch properties: ${res.status} ${res.statusText}`);
  }
  const envelope = (await res.json()) as ApiEnvelope<PaginatedResponse<PropertySummary>>;
  return envelope.data;
}

export async function listFeaturedProperties(limit = 8): Promise<PropertySummary[]> {
  try {
    const result = await listProperties({ featured: true, limit });
    return result.data;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[listFeaturedProperties] backend unreachable, returning empty list:', err);
    }
    return [];
  }
}

export interface SearchPropertiesResult {
  data: PropertySummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_RESULT: SearchPropertiesResult = {
  data: [],
  total: 0,
  page: 1,
  limit: 24,
  totalPages: 1,
};

export async function getPropertyDetail(id: string): Promise<PropertyDetail | null> {
  const url = `${BASE_URL}/properties/${id}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const envelope = (await res.json()) as ApiEnvelope<PropertyDetail>;
    return envelope.data;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[getPropertyDetail] request failed:', err);
    }
    return null;
  }
}

export interface UpdatePropertyCapacityInput {
  maxGuests?: number;
  maxAdults?: number;
  maxChildren?: number;
  maxInfants?: number;
}

export async function updateProperty(
  id: string,
  data: UpdatePropertyCapacityInput,
): Promise<PropertyDetail> {
  return api.patch<PropertyDetail>(`/properties/${id}`, data);
}

export async function getMyPropertyDetail(id: string): Promise<PropertyDetail> {
  return api.get<PropertyDetail>(`/properties/${id}`);
}

export async function createProperty(payload: CreatePropertyInput): Promise<{ id: string }> {
  return api.post<{ id: string }>('/properties', payload);
}

export async function patchProperty(
  id: string,
  payload: UpdatePropertyInput,
): Promise<PropertyDetail> {
  return api.patch<PropertyDetail>(`/properties/${id}`, payload);
}

export async function getPresignedPhotoUploadUrl(
  propertyId: string,
  body: CreatePresignedPhotoUrlInput,
): Promise<PresignedPhotoUrlResponse> {
  return api.post<PresignedPhotoUrlResponse>(
    `/properties/${propertyId}/photos/presigned-url`,
    body,
  );
}

export async function confirmPhotoUpload(
  propertyId: string,
  body: ConfirmPhotoUploadInput,
): Promise<{ id: string; key: string; url: string; isCover: boolean; sortOrder: number }> {
  return api.post(`/properties/${propertyId}/photos/confirm`, body);
}

export async function deletePropertyPhoto(
  propertyId: string,
  photoId: string,
): Promise<{ success: true }> {
  return api.delete(`/properties/${propertyId}/photos/${photoId}`);
}

export async function replacePropertyAmenities(
  propertyId: string,
  amenities: AmenityInput[],
): Promise<unknown> {
  return api.put(`/properties/${propertyId}/amenities`, { amenities });
}

export async function uploadPropertyPhotoFile(
  propertyId: string,
  file: File,
  options: { isCover?: boolean; sortOrder?: number } = {},
): Promise<{ id: string; key: string; url: string; isCover: boolean; sortOrder: number }> {
  const mimeType = (
    ALLOWED_PHOTO_MIME_TYPES.includes(file.type as PhotoMimeType) ? file.type : 'image/jpeg'
  ) as PhotoMimeType;
  const { uploadUrl, key } = await getPresignedPhotoUploadUrl(propertyId, { mimeType });
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': mimeType },
  });
  if (!putRes.ok) {
    throw new Error(`S3 upload failed: ${putRes.status}`);
  }
  return confirmPhotoUpload(propertyId, {
    key,
    isCover: options.isCover,
    sortOrder: options.sortOrder,
  });
}

export type HostListingStatusFilter = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE';

export interface ListMyPropertiesParams {
  page?: number;
  limit?: 10 | 20 | 30;
  tab?: HostListingTab;
  status?: HostListingStatusFilter;
  propertyType?: PropertyType;
  search?: string;
}

export async function listMyProperties(
  params: ListMyPropertiesParams = {},
): Promise<HostListingsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.tab) query.set('tab', params.tab);
  if (params.status) query.set('status', params.status);
  if (params.propertyType) query.set('propertyType', params.propertyType);
  const trimmed = params.search?.trim();
  if (trimmed) query.set('search', trimmed);
  const qs = query.toString();
  return api.get<HostListingsResponse>(`/properties/my${qs ? `?${qs}` : ''}`);
}

export async function deleteProperty(id: string): Promise<{ success: true }> {
  return api.delete<{ success: true }>(`/properties/${id}`);
}

/**
 * Always filters by featured=true per MVP product rule: only featured properties
 * are surfaced anywhere on the marketplace.
 */
export async function searchFeaturedProperties(
  filters: Omit<ListPropertiesParams, 'featured'> = {},
): Promise<SearchPropertiesResult> {
  try {
    return await listProperties({ ...filters, featured: true });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[searchFeaturedProperties] backend unreachable, returning empty result:', err);
    }
    return EMPTY_RESULT;
  }
}
