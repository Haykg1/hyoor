import type {
  BookingDetail,
  BookingQuoteInput,
  BookingQuoteResult,
  CreateBookingInput,
  PaginatedResponse,
} from '@repo/shared';

import { api } from '@/lib/api';

const listMyBookingsInFlight = new Map<string, Promise<PaginatedResponse<BookingDetail>>>();

function listMyBookingsCacheKey(params: {
  limit?: number;
  page?: number;
  status?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.page) qs.set('page', String(params.page));
  if (params.status) qs.set('status', params.status);
  return qs.toString();
}

export async function getBookingQuote(input: BookingQuoteInput): Promise<BookingQuoteResult> {
  const qs = new URLSearchParams({
    propertyId: input.propertyId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });
  if (input.promoCode?.trim()) {
    qs.set('promoCode', input.promoCode.trim().toUpperCase());
  }
  return api.get<BookingQuoteResult>(`/bookings/quote?${qs.toString()}`);
}

export async function createBooking(input: CreateBookingInput): Promise<BookingDetail> {
  return api.post<BookingDetail>('/bookings', input);
}

export async function getBookingById(id: string): Promise<BookingDetail> {
  return api.get<BookingDetail>(`/bookings/${id}`);
}

export async function listMyBookings(
  params: {
    limit?: number;
    page?: number;
    status?: string;
  } = {},
): Promise<PaginatedResponse<BookingDetail>> {
  const key = listMyBookingsCacheKey(params);
  const existing = listMyBookingsInFlight.get(key);
  if (existing) {
    return existing;
  }
  const query = key;
  const request = api
    .get<PaginatedResponse<BookingDetail>>(`/bookings/my${query ? `?${query}` : ''}`)
    .finally(() => {
      listMyBookingsInFlight.delete(key);
    });
  listMyBookingsInFlight.set(key, request);
  return request;
}

export interface CancelBookingInput {
  reason?: string;
}

export async function cancelBooking(
  bookingId: string,
  input: CancelBookingInput = {},
): Promise<BookingDetail> {
  return api.patch<BookingDetail>(`/bookings/${bookingId}/cancel`, input);
}
