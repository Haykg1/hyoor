import type {
  AvailabilityDayView,
  AvailabilityEntryInput,
  AvailabilityRangeResponse,
  OpenRangeInput,
  OpenRangeResult,
} from '@repo/shared';

import { api } from '@/lib/api';

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function getBlockedDates(
  propertyId: string,
  from: string,
  to: string,
): Promise<string[]> {
  const res = await api.get<{ dates: string[] }>(
    `/availability/${propertyId}/blocked?from=${from}&to=${to}`,
  );
  return res.dates;
}

export function getAvailabilityRange(
  propertyId: string,
  from: string,
  to: string,
): Promise<AvailabilityRangeResponse> {
  return api.get<AvailabilityRangeResponse>(`/availability/${propertyId}?from=${from}&to=${to}`);
}

export function bulkUpsertAvailability(
  propertyId: string,
  entries: AvailabilityEntryInput[],
): Promise<AvailabilityDayView[]> {
  return api.put<AvailabilityDayView[]>(`/availability/${propertyId}`, { entries });
}

export function openAvailabilityRange(
  propertyId: string,
  body: OpenRangeInput = {},
): Promise<OpenRangeResult> {
  return api.post<OpenRangeResult>(`/availability/${propertyId}/open-range`, body);
}

export function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  return {
    from: toIso(today),
    to: toIso(addMonths(today, 12)),
  };
}
