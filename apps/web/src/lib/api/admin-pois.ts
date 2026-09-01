import type {
  AdminPoi,
  PaginatedResponse,
  PhotoMimeType,
  PoiPhotoView,
  PresignedPhotoUrlResponse,
} from '@repo/shared';

import { api } from '@/lib/api';
import { compressImage } from '@/lib/compress-image';

export interface ListAdminPoisParams {
  page?: number;
  limit?: number;
  search?: string;
  citySlug?: string;
  category?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  usableInPlanner?: 'true' | 'false';
}

export interface AdminPoiWriteInput {
  id?: string;
  city: string;
  region: string;
  country?: string;
  latitude: number;
  longitude: number;
  category: string;
  tags?: string[];
  nameLabels: { en: string; hy: string; ru: string };
  descriptionLabels: { en: string; hy: string; ru: string };
  wikipediaTitle?: string;
  wikipediaUrl?: string;
  attributes?: {
    averageMealAmd?: number;
    priceBand?: 'budget' | 'mid' | 'upscale';
    servesAlcohol?: boolean;
    typicalDurationMin?: number;
    openingHoursNote?: string;
    website?: string;
    websiteMenu?: string;
    phone?: string;
  };
  status?: 'DRAFT' | 'PUBLISHED';
  usableInPlanner?: boolean;
  sortOrder?: number;
}

export interface PoiSeedResult {
  metroDatasets: number;
  destinationDatasets: number;
  seededEntries: number;
}

export async function listAdminPois(
  params: ListAdminPoisParams = {},
): Promise<PaginatedResponse<AdminPoi>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.citySlug) query.set('citySlug', params.citySlug);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.usableInPlanner) query.set('usableInPlanner', params.usableInPlanner);
  const qs = query.toString();
  return api.get<PaginatedResponse<AdminPoi>>(`/admin/pois${qs ? `?${qs}` : ''}`);
}

export async function getAdminPoi(id: string): Promise<AdminPoi> {
  return api.get<AdminPoi>(`/admin/pois/${id}`);
}

export async function createAdminPoi(body: AdminPoiWriteInput): Promise<AdminPoi> {
  return api.post<AdminPoi>('/admin/pois', body);
}

export async function updateAdminPoi(
  id: string,
  body: Partial<AdminPoiWriteInput>,
): Promise<AdminPoi> {
  return api.patch<AdminPoi>(`/admin/pois/${id}`, body);
}

export async function deleteAdminPoi(id: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/admin/pois/${id}`);
}

export async function seedAdminPois(): Promise<PoiSeedResult> {
  return api.post<PoiSeedResult>('/admin/poi/seed');
}

export async function uploadAdminPoiPhoto(poiId: string, file: File): Promise<PoiPhotoView> {
  const mimeType = (file.type || 'image/jpeg') as PhotoMimeType;
  const compressed = await compressImage(file);
  const { uploadUrl, key } = await api.post<PresignedPhotoUrlResponse>(
    `/admin/pois/${poiId}/photos/presigned-url`,
    { mimeType },
  );
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: compressed,
    headers: { 'Content-Type': mimeType },
  });
  if (!putRes.ok) {
    throw new Error(`S3 upload failed: ${putRes.status}`);
  }
  return api.post<PoiPhotoView>(`/admin/pois/${poiId}/photos/confirm`, { key });
}

export async function deleteAdminPoiPhoto(
  poiId: string,
  photoId: string,
): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/admin/pois/${poiId}/photos/${photoId}`);
}

export async function setAdminPoiPhotoStatus(
  poiId: string,
  photoId: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<PoiPhotoView> {
  return api.patch<PoiPhotoView>(`/admin/pois/${poiId}/photos/${photoId}`, { status });
}

export async function suggestAdminPoiPhotos(
  poiId: string,
  query?: string,
): Promise<{ urls: string[]; configured: boolean }> {
  return api.post<{ urls: string[]; configured: boolean }>(
    `/admin/pois/${poiId}/photos/suggest`,
    query ? { query } : {},
  );
}

export async function importAdminPoiPhoto(
  poiId: string,
  input: { url: string; attribution?: string; license?: string; sourceUrl?: string },
): Promise<PoiPhotoView> {
  return api.post<PoiPhotoView>(`/admin/pois/${poiId}/photos/import`, input);
}
