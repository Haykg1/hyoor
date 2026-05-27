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

export function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  return {
    from: toIso(today),
    to: toIso(addMonths(today, 12)),
  };
}
