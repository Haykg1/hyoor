import type { AdminHost, PaginatedResponse } from '@repo/shared';

import { api } from '@/lib/api';

export interface ListAdminHostsParams {
  page?: number;
  limit?: number;
  search?: string;
  hostType?: 'INDIVIDUAL' | 'COMPANY';
  isVerified?: boolean;
  hasFeeOverride?: boolean;
}

export async function listAdminHosts(
  params: ListAdminHostsParams = {},
): Promise<PaginatedResponse<AdminHost>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.hostType) query.set('hostType', params.hostType);
  if (params.isVerified !== undefined) query.set('isVerified', String(params.isVerified));
  if (params.hasFeeOverride !== undefined) {
    query.set('hasFeeOverride', String(params.hasFeeOverride));
  }
  const trimmed = params.search?.trim();
  if (trimmed) query.set('search', trimmed);
  const qs = query.toString();
  return api.get<PaginatedResponse<AdminHost>>(`/admin/hosts${qs ? `?${qs}` : ''}`);
}

export async function updateHostPlatformFee(
  hostId: string,
  platformFeePercent: number | null,
): Promise<AdminHost> {
  return api.patch<AdminHost>(`/admin/hosts/${hostId}/platform-fee`, { platformFeePercent });
}
