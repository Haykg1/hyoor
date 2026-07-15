/** Calendar YYYY-MM-DD for the given instant in local timezone. */
export function todayIsoLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Calendar YYYY-MM-DD for the given instant in UTC. */
export function todayIsoUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDateString(value: string | undefined): value is string {
  if (!value) return false;
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function addUtcDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetweenIso(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split('-').map(Number) as [number, number, number];
  const [y2, m2, d2] = checkOut.split('-').map(Number) as [number, number, number];
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

export interface ExactStayDates {
  checkIn?: string;
  checkOut?: string;
}

/**
 * Ensures exact stay dates are not in the past. If check-in is before today,
 * shifts the whole stay forward so check-in becomes today (duration preserved).
 * Invalid or incomplete pairs are cleared.
 */
export function sanitizeExactStayDates(
  checkIn: string | undefined,
  checkOut: string | undefined,
  todayIso: string = todayIsoUtc(),
): ExactStayDates {
  if (!isIsoDateString(checkIn) || !isIsoDateString(checkOut)) {
    return {};
  }
  if (checkOut <= checkIn) {
    return {};
  }
  let nextIn = checkIn;
  let nextOut = checkOut;
  if (nextIn < todayIso) {
    const nights = nightsBetweenIso(nextIn, nextOut);
    nextIn = todayIso;
    nextOut = addUtcDays(nextIn, nights);
  }
  if (nextOut <= nextIn) {
    nextOut = addUtcDays(nextIn, 1);
  }
  return { checkIn: nextIn, checkOut: nextOut };
}

export interface FlexibleStayWindow {
  availableFrom?: string;
  availableTo?: string;
}

/**
 * Clamps a flexible search window so it cannot start before today.
 * Clears the window when nothing remains after today.
 */
export function sanitizeFlexibleStayWindow(
  availableFrom: string | undefined,
  availableTo: string | undefined,
  todayIso: string = todayIsoUtc(),
): FlexibleStayWindow {
  if (!isIsoDateString(availableFrom) || !isIsoDateString(availableTo)) {
    return {};
  }
  let from = availableFrom;
  const to = availableTo;
  if (from < todayIso) from = todayIso;
  if (to < from) return {};
  return { availableFrom: from, availableTo: to };
}

export interface SearchDateFields {
  checkIn?: string;
  checkOut?: string;
  stayNights?: number;
  availableFrom?: string;
  availableTo?: string;
}

/**
 * Sanitizes AI/search date fields so past stays cannot be applied.
 * Prefers exact dates when both sides exist after sanitization; otherwise flexible window.
 */
export function sanitizeSearchDateFields<T extends SearchDateFields>(
  fields: T,
  todayIso: string = todayIsoUtc(),
): T {
  const exact = sanitizeExactStayDates(fields.checkIn, fields.checkOut, todayIso);
  const flexible = sanitizeFlexibleStayWindow(fields.availableFrom, fields.availableTo, todayIso);
  const next = { ...fields };
  if (exact.checkIn && exact.checkOut) {
    next.checkIn = exact.checkIn;
    next.checkOut = exact.checkOut;
    next.availableFrom = undefined;
    next.availableTo = undefined;
    return next;
  }
  next.checkIn = undefined;
  next.checkOut = undefined;
  if (
    flexible.availableFrom &&
    flexible.availableTo &&
    fields.stayNights &&
    fields.stayNights >= 1
  ) {
    next.availableFrom = flexible.availableFrom;
    next.availableTo = flexible.availableTo;
    return next;
  }
  next.availableFrom = undefined;
  next.availableTo = undefined;
  next.stayNights = undefined;
  return next;
}

/** Last calendar day of the UTC month that contains `iso`. */
export function endOfUtcMonthIso(iso: string): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

/**
 * Flexible window from today through the last day of the current UTC month
 * (at least one check-in day).
 */
export function currentMonthStayWindow(todayIso: string = todayIsoUtc()): FlexibleStayWindow {
  const availableFrom = todayIso;
  let availableTo = endOfUtcMonthIso(todayIso);
  if (availableTo < availableFrom) {
    availableTo = availableFrom;
  }
  return { availableFrom, availableTo };
}

/**
 * Fills missing AI stay timing: default stay length is 1 night; default window is
 * the remainder of the current month. Exact check-in/out pairs are left alone.
 */
export function applyAiSearchDateDefaults<T extends SearchDateFields>(
  fields: T,
  todayIso: string = todayIsoUtc(),
): T {
  if (
    isIsoDateString(fields.checkIn) &&
    isIsoDateString(fields.checkOut) &&
    fields.checkOut > fields.checkIn
  ) {
    return fields;
  }
  const next = { ...fields };
  next.checkIn = undefined;
  next.checkOut = undefined;
  const flexible = sanitizeFlexibleStayWindow(fields.availableFrom, fields.availableTo, todayIso);
  if (flexible.availableFrom && flexible.availableTo) {
    next.availableFrom = flexible.availableFrom;
    next.availableTo = flexible.availableTo;
  } else {
    const month = currentMonthStayWindow(todayIso);
    next.availableFrom = month.availableFrom;
    next.availableTo = month.availableTo;
  }
  next.stayNights = fields.stayNights && fields.stayNights >= 1 ? Math.floor(fields.stayNights) : 1;
  return next;
}

/** AI search: apply timing defaults, then strip/clamp past dates. */
export function resolveAiSearchDateFields<T extends SearchDateFields>(
  fields: T,
  todayIso: string = todayIsoUtc(),
): T {
  return sanitizeSearchDateFields(applyAiSearchDateDefaults(fields, todayIso), todayIso);
}
