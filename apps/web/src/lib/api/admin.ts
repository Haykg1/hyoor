import type {
  HostDashboardStats,
  HostListingTab,
  HostListingsResponse,
  PropertyStatus,
  PropertyType,
} from '@repo/shared';

import { api } from '@/lib/api';

export type AdminListingStatusFilter = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED';

export type TimeseriesMetric = 'users' | 'bookings' | 'revenue';
export type TimeseriesRange = 'day' | 'week' | 'month';

export interface PlatformStats {
  users: {
    total: number;
    byRole: Record<string, number>;
    active: number;
  };
  properties: {
    total: number;
    byStatus: Record<string, number>;
  };
  bookings: {
    total: number;
    byStatus: Record<string, number>;
  };
  reviews: {
    total: number;
    avgRating: number | null;
  };
}

export interface TimeseriesBucket {
  bucket: string;
  value: number;
}

export interface TimeseriesResponse {
  metric: TimeseriesMetric;
  range: TimeseriesRange;
  from: string;
  to: string;
  data: TimeseriesBucket[];
}

export interface ListAdminPropertiesParams {
  page?: number;
  limit?: 10 | 20 | 30;
  tab?: HostListingTab;
  status?: AdminListingStatusFilter;
  propertyType?: PropertyType;
  search?: string;
}

export interface GetAdminTimeseriesParams {
  metric?: TimeseriesMetric;
  range?: TimeseriesRange;
  from?: string;
  to?: string;
}

export async function getAdminDashboardStats(): Promise<HostDashboardStats> {
  return api.get<HostDashboardStats>('/admin/dashboard/stats');
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return api.get<PlatformStats>('/admin/stats');
}

export async function getAdminTimeseries(
  params: GetAdminTimeseriesParams = {},
): Promise<TimeseriesResponse> {
  const query = new URLSearchParams();
  if (params.metric) query.set('metric', params.metric);
  if (params.range) query.set('range', params.range);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const qs = query.toString();
  return api.get<TimeseriesResponse>(`/admin/stats/timeseries${qs ? `?${qs}` : ''}`);
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
