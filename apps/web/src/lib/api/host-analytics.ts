import type { HostAnalyticsPreset, HostAnalyticsResponse } from '@repo/shared';

import { api } from '@/lib/api';

export interface GetHostAnalyticsParams {
  preset?: HostAnalyticsPreset;
  from?: string;
  to?: string;
  /** Omit or empty string = all properties. */
  propertyId?: string;
}

export async function getHostAnalytics(
  params: GetHostAnalyticsParams = {},
): Promise<HostAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params.preset) query.set('preset', params.preset);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.propertyId) query.set('propertyId', params.propertyId);
  const qs = query.toString();
  return api.get<HostAnalyticsResponse>(`/host-analytics${qs ? `?${qs}` : ''}`);
}
