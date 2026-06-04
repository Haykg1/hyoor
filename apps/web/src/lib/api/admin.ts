import type {
  HostDashboardStats,
  HostListingTab,
  HostListingsResponse,
  PropertyStatus,
  PropertyType,
} from '@repo/shared';

import { api } from '@/lib/api';

export type AdminListingStatusFilter = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED';

export interface ListAdminPropertiesParams {
  page?: number;
  limit?: 10 | 20 | 30;
  tab?: HostListingTab;
  status?: AdminListingStatusFilter;
  propertyType?: PropertyType;
  search?: string;
}

export async function getAdminDashboardStats(): Promise<HostDashboardStats> {
  return api.get<HostDashboardStats>('/admin/dashboard/stats');
}

export async function listAdminProperties(
  params: ListAdminPropertiesParams = {},
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
  return api.get<HostListingsResponse>(`/admin/properties${qs ? `?${qs}` : ''}`);
}

export async function updateAdminPropertyStatus(id: string, status: PropertyStatus): Promise<void> {
  await api.patch(`/admin/properties/${id}/status`, { status });
}
