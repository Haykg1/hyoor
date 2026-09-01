import type {
  TripPlanDetail,
  TripPlanGenerateResponse,
  TripPlanPreferences,
  TripPlanSummary,
  TripPlannerQuotaView,
} from '@repo/shared';

import { api } from '@/lib/api';

export interface CreateTripPlanInput {
  city?: string;
  region?: string;
  checkIn?: string;
  checkOut?: string;
  bookingId?: string;
  guestCount?: number;
  /** All four answers are required — the plan is created and generation starts on this call. */
  preferences: TripPlanPreferences;
  locale?: string;
}

export interface UpdateTripPlanInput {
  guestCount?: number;
  preferences?: TripPlanPreferences;
  locale?: string;
}

export async function getTripPlannerQuota(): Promise<TripPlannerQuotaView> {
  return api.get<TripPlannerQuotaView>('/trip-planner/quota');
}

export async function listTripPlans(): Promise<TripPlanSummary[]> {
  return api.get<TripPlanSummary[]>('/trip-planner');
}

export async function createTripPlan(
  input: CreateTripPlanInput,
): Promise<TripPlanGenerateResponse> {
  return api.post<TripPlanGenerateResponse>('/trip-planner', input);
}

export async function getTripPlan(id: string): Promise<TripPlanDetail> {
  return api.get<TripPlanDetail>(`/trip-planner/${id}`);
}

export async function deleteTripPlan(id: string): Promise<void> {
  await api.delete<void>(`/trip-planner/${id}`);
}

export async function updateTripPlan(
  id: string,
  input: UpdateTripPlanInput,
): Promise<TripPlanDetail> {
  return api.patch<TripPlanDetail>(`/trip-planner/${id}`, input);
}

export async function generateTripPlan(
  id: string,
  input: UpdateTripPlanInput = {},
): Promise<TripPlanGenerateResponse> {
  return api.post<TripPlanGenerateResponse>(`/trip-planner/${id}/generate`, input);
}

export async function regenerateTripPlanDay(
  id: string,
  date: string,
): Promise<TripPlanGenerateResponse> {
  return api.post<TripPlanGenerateResponse>(`/trip-planner/${id}/days/${date}/regenerate`, {});
}

export async function swapTripPlanItem(
  id: string,
  itemId: string,
): Promise<TripPlanGenerateResponse> {
  return api.post<TripPlanGenerateResponse>(`/trip-planner/${id}/items/${itemId}/swap`, {});
}

export async function attachTripPlanBooking(
  id: string,
  bookingId: string,
): Promise<TripPlanDetail> {
  return api.post<TripPlanDetail>(`/trip-planner/${id}/booking`, { bookingId });
}
