export interface FlexibleStayMatch {
  suggestedCheckIn: string;
  suggestedCheckOut: string;
}

export const MAX_FLEXIBLE_WINDOW_DAYS = 62;

export function utcDateFromString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function eachNightBetween(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  let current = utcDateFromString(formatIsoDate(checkIn));
  const end = utcDateFromString(formatIsoDate(checkOut));
  while (current < end) {
    nights.push(new Date(current.getTime()));
    current = addDays(current, 1);
  }
  return nights;
}

export function diffDaysInclusive(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay) + 1;
}

export function isStayRangeAvailable(
  blockedDates: ReadonlySet<string>,
  checkInIso: string,
  stayNights: number,
): boolean {
  const checkIn = utcDateFromString(checkInIso);
  if (Number.isNaN(checkIn.getTime()) || stayNights < 1) {
    return false;
  }
  const checkOut = addDays(checkIn, stayNights);
  for (const night of eachNightBetween(checkIn, checkOut)) {
    if (blockedDates.has(formatIsoDate(night))) {
      return false;
    }
  }
  return true;
}

/**
 * Finds the first consecutive stay of `stayNights` within [availableFrom, availableTo]
 * where `availableTo` is the latest allowed check-in date.
 */
export function findFirstFlexibleStaySlot(
  blockedDates: ReadonlySet<string>,
  availableFrom: string,
  availableTo: string,
  stayNights: number,
): FlexibleStayMatch | null {
  const fromDate = utcDateFromString(availableFrom);
  const lastCheckInDate = utcDateFromString(availableTo);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(lastCheckInDate.getTime())) {
    return null;
  }
  if (stayNights < 1 || lastCheckInDate < fromDate) {
    return null;
  }
  let cursor = fromDate;
  while (cursor <= lastCheckInDate) {
    const checkInIso = formatIsoDate(cursor);
    if (isStayRangeAvailable(blockedDates, checkInIso, stayNights)) {
      return {
        suggestedCheckIn: checkInIso,
        suggestedCheckOut: formatIsoDate(addDays(cursor, stayNights)),
      };
    }
    cursor = addDays(cursor, 1);
  }
  return null;
}

export function buildBlockedDatesForProperty(
  bookings: ReadonlyArray<{ checkIn: Date; checkOut: Date }>,
  closedAvailability: ReadonlyArray<{ date: Date }>,
  rangeFrom: Date,
  rangeTo: Date,
): Set<string> {
  const blocked = new Set<string>();
  for (const row of closedAvailability) {
    if (row.date >= rangeFrom && row.date <= rangeTo) {
      blocked.add(formatIsoDate(row.date));
    }
  }
  for (const booking of bookings) {
    for (const night of eachNightBetween(booking.checkIn, booking.checkOut)) {
      if (night >= rangeFrom && night <= rangeTo) {
        blocked.add(formatIsoDate(night));
      }
    }
  }
  return blocked;
}
