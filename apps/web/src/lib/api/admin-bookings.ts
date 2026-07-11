import type { AdminBooking, PaginatedResponse } from '@repo/shared';

import { api } from '@/lib/api';

export interface ListAdminBookingsParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  payoutStatus?: string;
  depositStatus?: string;
  propertyId?: string;
  guestId?: string;
  hostId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export async function listAdminBookings(
  params: ListAdminBookingsParams = {},
): Promise<PaginatedResponse<AdminBooking>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
  if (params.payoutStatus) query.set('payoutStatus', params.payoutStatus);
  if (params.depositStatus) query.set('depositStatus', params.depositStatus);
  if (params.propertyId) query.set('propertyId', params.propertyId);
  if (params.guestId) query.set('guestId', params.guestId);
  if (params.hostId) query.set('hostId', params.hostId);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const trimmed = params.search?.trim();
  if (trimmed) query.set('search', trimmed);
  const qs = query.toString();
  return api.get<PaginatedResponse<AdminBooking>>(`/admin/bookings${qs ? `?${qs}` : ''}`);
}

export async function retryAdminRentCapture(bookingId: string): Promise<AdminBooking> {
  return api.post<AdminBooking>(`/admin/bookings/${bookingId}/retry-rent-capture`, {});
}

export async function retryAdminPayout(bookingId: string): Promise<AdminBooking> {
  return api.post<AdminBooking>(`/admin/bookings/${bookingId}/retry-payout`, {});
}
