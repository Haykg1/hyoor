import type { AdminPaymentFailure, PaginatedResponse, PaymentFailureCategory } from '@repo/shared';

import { api } from '@/lib/api';

export interface ListPaymentFailuresParams {
  page?: number;
  limit?: number;
  bookingId?: string;
  propertyId?: string;
  hostId?: string;
  guestId?: string;
  category?: PaymentFailureCategory;
  resolved?: boolean;
  search?: string;
}

export async function listPaymentFailures(
  params: ListPaymentFailuresParams = {},
): Promise<PaginatedResponse<AdminPaymentFailure>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.bookingId) query.set('bookingId', params.bookingId);
  if (params.propertyId) query.set('propertyId', params.propertyId);
  if (params.hostId) query.set('hostId', params.hostId);
  if (params.guestId) query.set('guestId', params.guestId);
  if (params.category) query.set('category', params.category);
  if (params.resolved !== undefined) query.set('resolved', String(params.resolved));
  const trimmed = params.search?.trim();
  if (trimmed) query.set('search', trimmed);
  const qs = query.toString();
  return api.get<PaginatedResponse<AdminPaymentFailure>>(
    `/admin/payment-failures${qs ? `?${qs}` : ''}`,
  );
}

export async function resolvePaymentFailure(id: string): Promise<void> {
  await api.patch(`/admin/payment-failures/${id}/resolve`, {});
}

export async function resolvePaymentFailures(ids: string[]): Promise<{ resolvedCount: number }> {
  return api.patch<{ resolvedCount: number }>('/admin/payment-failures/resolve', { ids });
}
