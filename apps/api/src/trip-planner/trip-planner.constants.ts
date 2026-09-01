export const TRIP_PLANNER_TZ = 'Asia/Yerevan';
export const TRIP_PLANNER_MAX_NIGHTS = 10;
/** Absolute ceiling; the effective per-day limit scales with trip length. */
export const TRIP_PLANNER_MAX_STOPS_PER_DAY = 6;
export const TRIP_PLANNER_DAILY_PLANS = 4;

/**
 * Shorter trips pack more into each day. 10 days → 3/day, then +1 per band down
 * to 6/day for trips of 3 nights or fewer.
 */
export function maxStopsForNights(nights: number): number {
  if (nights >= 10) return 3;
  if (nights >= 7) return 4;
  if (nights >= 4) return 5;
  return 6;
}
export const TRIP_PLANNER_UNITS_PER_PLAN = 4;
export const TRIP_PLANNER_JOB_TTL_SECONDS = 15 * 60;

export function yerevanDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TRIP_PLANNER_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Armenia observes UTC+4 with no DST. */
export function secondsUntilYerevanMidnight(now = new Date()): number {
  const key = yerevanDateKey(now);
  const [year, month, day] = key.split('-').map((part) => Number(part));
  const nextMidnightUtc = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 20, 0, 0);
  return Math.max(60, Math.ceil((nextMidnightUtc - now.getTime()) / 1000));
}
