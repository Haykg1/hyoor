export const CancellationFeeTypes = ['PERCENT', 'FIXED'] as const;
export type CancellationFeeType = (typeof CancellationFeeTypes)[number];

export const MAX_CANCELLATION_FEE_PERCENT = 50;
export const MIN_CANCELLATION_DEADLINE_DAYS = 0;
export const MAX_CANCELLATION_DEADLINE_DAYS = 100;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Amount of rent kept (not refunded) when a cancellation fee is applied.
 * `rentAmount` and fixed `feeValue` are in minor currency units.
 */
export function computeCancellationFee(
  rentAmount: number,
  feeType: CancellationFeeType,
  feeValue: number,
): number {
  if (rentAmount <= 0 || feeValue <= 0) {
    return 0;
  }
  if (feeType === 'FIXED') {
    return Math.min(feeValue, rentAmount);
  }
  return Math.round((rentAmount * feeValue) / 100);
}

/** Guest may cancel whenever the policy allows refunds (fee is applied per its type). */
export function isGuestCancellationAllowed(cancellationPolicy: string): boolean {
  return cancellationPolicy !== 'NON_REFUNDABLE';
}

export function normalizeCancellationDeadlineDays(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return MIN_CANCELLATION_DEADLINE_DAYS;
  }
  return Math.min(
    MAX_CANCELLATION_DEADLINE_DAYS,
    Math.max(MIN_CANCELLATION_DEADLINE_DAYS, Math.trunc(value)),
  );
}

function toUtcCalendarDate(checkIn: string | Date): Date | null {
  if (typeof checkIn === 'string') {
    const [year, month, day] = checkIn.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  }
  if (Number.isNaN(checkIn.getTime())) {
    return null;
  }
  return new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate()));
}

function utcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Instant when guest cancel closes (exclusive).
 * `deadlineDays = 0` → check-in day (cancel any time before check-in).
 * `deadlineDays = N` → check-in minus N days.
 */
export function getGuestCancellationDeadlineAt(
  checkIn: string | Date,
  deadlineDays: number,
): Date | null {
  const checkInDate = toUtcCalendarDate(checkIn);
  if (!checkInDate) {
    return null;
  }
  const days = normalizeCancellationDeadlineDays(deadlineDays);
  const latestCancelAt = new Date(checkInDate.getTime());
  latestCancelAt.setUTCDate(latestCancelAt.getUTCDate() - days);
  return latestCancelAt;
}

/** Whole UTC calendar days from today until the exclusive cancel deadline. */
export function getGuestCancellationDaysLeft(
  checkIn: string | Date,
  deadlineDays: number,
  now: Date = new Date(),
): number {
  const deadlineAt = getGuestCancellationDeadlineAt(checkIn, deadlineDays);
  if (!deadlineAt) {
    return 0;
  }
  return Math.max(
    0,
    Math.round((deadlineAt.getTime() - utcStartOfDay(now).getTime()) / MS_PER_DAY),
  );
}

/**
 * Guest cancel window relative to check-in.
 * `deadlineDays = 0` → any time before check-in.
 * `deadlineDays = N` → must cancel before (check-in minus N days).
 */
export function isWithinGuestCancellationWindow(
  checkIn: string | Date,
  deadlineDays: number,
  now: Date = new Date(),
): boolean {
  const latestCancelAt = getGuestCancellationDeadlineAt(checkIn, deadlineDays);
  if (!latestCancelAt) {
    return false;
  }
  return now.getTime() < latestCancelAt.getTime();
}

/** Combined guest policy + deadline check used by booking cancel flows. */
export function canGuestCancelStay(params: {
  cancellationPolicy: string;
  checkIn: string | Date;
  cancellationDeadlineDays?: number | null;
  now?: Date;
}): boolean {
  if (!isGuestCancellationAllowed(params.cancellationPolicy)) {
    return false;
  }
  return isWithinGuestCancellationWindow(
    params.checkIn,
    params.cancellationDeadlineDays ?? 0,
    params.now,
  );
}

export type GuestCancellationWindowStatus = {
  canCancel: boolean;
  deadlineAt: Date | null;
  /** Exclusive cancel deadline as YYYY-MM-DD (UTC). */
  deadlineIso: string | null;
  daysLeft: number;
};

/** Stay-specific cancel window for guest UI (rule + chosen check-in). */
export function getGuestCancellationWindowStatus(params: {
  cancellationPolicy: string;
  checkIn: string | Date;
  cancellationDeadlineDays?: number | null;
  now?: Date;
}): GuestCancellationWindowStatus {
  const now = params.now ?? new Date();
  const deadlineDays = params.cancellationDeadlineDays ?? 0;
  const deadlineAt = getGuestCancellationDeadlineAt(params.checkIn, deadlineDays);
  return {
    canCancel: canGuestCancelStay({
      cancellationPolicy: params.cancellationPolicy,
      checkIn: params.checkIn,
      cancellationDeadlineDays: deadlineDays,
      now,
    }),
    deadlineAt,
    deadlineIso: deadlineAt ? deadlineAt.toISOString().slice(0, 10) : null,
    daysLeft: getGuestCancellationDaysLeft(params.checkIn, deadlineDays, now),
  };
}
