import type { HostCalendarChangeEntry } from '@repo/shared';

export function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDateOnly(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function eachDayInclusive(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from.getTime());
  while (cursor.getTime() <= to.getTime()) {
    days.push(new Date(cursor.getTime()));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function expandDateRangeToEntries(
  dateFrom: string,
  dateTo: string,
  isAvailable: boolean,
  priceOverride: number | null | undefined,
): HostCalendarChangeEntry[] {
  const from = parseIsoDateOnly(dateFrom);
  const to = parseIsoDateOnly(dateTo);
  if (from.getTime() > to.getTime()) {
    throw new Error('dateFrom must be on or before dateTo');
  }
  return eachDayInclusive(from, to).map((date) => ({
    date: formatIsoDate(date),
    isAvailable,
    ...(priceOverride !== undefined ? { priceOverride } : {}),
  }));
}

export interface CalendarDayState {
  date: string;
  isAvailable: boolean;
  isBlockedByBooking: boolean;
  priceOverride: number | null;
}

export function entryMatchesCurrent(
  entry: HostCalendarChangeEntry,
  current: CalendarDayState | undefined,
  basePricePerNight: number,
): boolean {
  if (!current || current.isBlockedByBooking) return false;
  const targetAvailable = entry.isAvailable;
  if (current.isAvailable !== targetAvailable) return false;
  if (entry.priceOverride === null) {
    return current.priceOverride === null;
  }
  if (entry.priceOverride !== undefined) {
    return current.priceOverride === entry.priceOverride;
  }
  return current.priceOverride === null || current.priceOverride === basePricePerNight;
}

export function diffProposedVsCurrent(
  proposed: HostCalendarChangeEntry[],
  currentByDate: Map<string, CalendarDayState>,
  basePricePerNight: number,
): HostCalendarChangeEntry[] {
  return proposed.filter((entry) => {
    const current = currentByDate.get(entry.date);
    return !entryMatchesCurrent(entry, current, basePricePerNight);
  });
}
