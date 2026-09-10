import type { CompactCandidate } from './trip-planner-candidates.service';

export interface ResolvedPick {
  poiId: string;
  startTime: string;
  endTime: string;
  whyThisFits: string;
}

export interface ResolvedDay {
  theme: string;
  picks: ResolvedPick[];
}

export interface ResolvedPlan {
  summary: string;
  days: ResolvedDay[];
}

/** Trips shorter than this get unique eating places across the whole trip. */
const UNIQUE_MEALS_UNDER_NIGHTS = 5;
/** A day only gets a second eating place once it has more sights than this. */
const TWO_MEALS_MIN_SIGHTS = 4;
/** Hard ceiling on eating places per day, regardless of sight count. */
const MAX_MEALS_PER_DAY = 2;
/** A single day may not send the traveller across more than this many cities. */
const MAX_CITIES_PER_DAY = 2;
const NOON_MINUTES = 12 * 60;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLOTS: [string, string][] = [
  ['09:00', '10:30'],
  ['10:45', '12:00'],
  ['12:30', '14:00'],
  ['14:30', '16:00'],
  ['16:15', '17:45'],
  ['18:00', '19:15'],
  ['19:45', '21:00'],
];

/** Eating places allowed on a day with `sightCount` non-meal stops. */
function mealCapForSights(sightCount: number): number {
  return sightCount > TWO_MEALS_MIN_SIGHTS ? MAX_MEALS_PER_DAY : 1;
}

/** True when adding this candidate would push the day past its city ceiling. */
function introducesCity(candidate: CompactCandidate, dayCities: Set<string>): boolean {
  if (!candidate.citySlug || dayCities.has(candidate.citySlug)) return false;
  return dayCities.size >= MAX_CITIES_PER_DAY;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function resolveCandidate(
  pick: Record<string, unknown>,
  byNumber: Map<number, CompactCandidate>,
  byId: Map<string, CompactCandidate>,
): CompactCandidate | null {
  const n = pick.n ?? pick.number ?? pick.candidate;
  if (typeof n === 'number' && byNumber.has(n)) return byNumber.get(n) ?? null;
  if (typeof n === 'string' && byId.has(n)) return byId.get(n) ?? null;
  const poiId = asString(pick.poiId ?? pick.id);
  if (poiId && byId.has(poiId)) return byId.get(poiId) ?? null;
  return null;
}

export function parseProposedPlan(
  json: unknown,
  candidates: CompactCandidate[],
  nights: number,
  maxStops: number,
  blockTags: string[] = [],
): ResolvedPlan | null {
  const root = asRecord(json);
  if (!root) return null;
  const byNumber = new Map(candidates.map((candidate) => [candidate.n, candidate]));
  const byId = new Map(candidates.map((candidate) => [candidate.poiId, candidate]));
  const blocked = new Set(blockTags);
  const notBlocked = (candidate: CompactCandidate): boolean =>
    !candidate.tags.some((tag) => blocked.has(tag));
  const strictMeals = nights < UNIQUE_MEALS_UNDER_NIGHTS;
  const usedMeals = new Set<string>();
  const mealPool = candidates.filter((candidate) => candidate.isMeal && notBlocked(candidate));
  const sightPool = candidates.filter((candidate) => !candidate.isMeal && notBlocked(candidate));

  const rawDays = Array.isArray(root.days) ? root.days.slice(0, nights) : [];
  const days: ResolvedDay[] = [];

  for (const rawDay of rawDays) {
    const dayRecord = asRecord(rawDay);
    const theme = asString(dayRecord?.theme) || 'Day plan';
    const rawPicks = Array.isArray(dayRecord?.picks)
      ? dayRecord.picks
      : Array.isArray(dayRecord?.items)
        ? dayRecord.items
        : [];
    const usedToday = new Set<string>();
    const dayCities = new Set<string>();
    const picks: ResolvedPick[] = [];
    for (const rawPick of rawPicks) {
      const pickRecord = asRecord(rawPick);
      if (!pickRecord) continue;
      const candidate = resolveCandidate(pickRecord, byNumber, byId);
      if (!candidate || !notBlocked(candidate)) continue;
      if (usedToday.has(candidate.poiId)) continue; // no place twice on one day
      if (introducesCity(candidate, dayCities)) continue; // at most two cities a day
      if (candidate.isMeal && strictMeals && usedMeals.has(candidate.poiId)) continue;
      const startTime = asString(pickRecord.startTime);
      const endTime = asString(pickRecord.endTime);
      if (!TIME.test(startTime) || !TIME.test(endTime)) continue;
      if (toMinutes(endTime) <= toMinutes(startTime)) continue;
      usedToday.add(candidate.poiId);
      if (candidate.citySlug) dayCities.add(candidate.citySlug);
      if (candidate.isMeal) usedMeals.add(candidate.poiId);
      picks.push({
        poiId: candidate.poiId,
        startTime,
        endTime,
        whyThisFits: asString(pickRecord.whyThisFits).slice(0, 280),
      });
    }
    picks.sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime));
    // Keep one extra pick over the base ceiling so a busy day can still land a second meal.
    days.push({ theme, picks: picks.slice(0, maxStops + 1) });
  }

  while (days.length < nights) days.push({ theme: 'Day plan', picks: [] });

  let sightCursor = 0;
  const isMeal = (poiId: string): boolean => byId.get(poiId)?.isMeal ?? false;
  const cityOf = (poiId: string): string => byId.get(poiId)?.citySlug ?? '';
  for (const day of days) {
    const usedToday = new Set(day.picks.map((pick) => pick.poiId));
    const dayCities = new Set(day.picks.map((pick) => cityOf(pick.poiId)).filter(Boolean));
    const sightsOn = (): ResolvedPick[] => day.picks.filter((pick) => !isMeal(pick.poiId));
    // Keep a second eating place only when the model itself planned a sight-heavy
    // day (more than four non-meal picks); otherwise a day gets a single meal.
    const mealCap = mealCapForSights(sightsOn().length);
    trimMeals(day, mealCap, isMeal, usedMeals);
    // Fill sparse days with sights, always leaving one slot for the day's meal,
    // and never crossing into a third city.
    const sightTarget = Math.max(1, maxStops - 1);
    for (
      let guard = 0;
      sightsOn().length < sightTarget && guard < sightPool.length * 2;
      guard += 1
    ) {
      const candidate = sightPool[sightCursor % sightPool.length];
      sightCursor += 1;
      if (!candidate || usedToday.has(candidate.poiId)) continue;
      if (introducesCity(candidate, dayCities)) continue;
      usedToday.add(candidate.poiId);
      if (candidate.citySlug) dayCities.add(candidate.citySlug);
      day.picks.push({ poiId: candidate.poiId, startTime: '', endTime: '', whyThisFits: '' });
    }
    // A two-meal day may run one stop longer than the base ceiling.
    const slotBudget = Math.min(SLOTS.length, maxStops + mealCap - 1);
    let meals = day.picks.filter((pick) => isMeal(pick.poiId));
    if (meals.length === 0) {
      const meal = findDayMeal(mealPool, usedToday, usedMeals, dayCities);
      if (meal) {
        usedMeals.add(meal.poiId);
        if (meal.citySlug) dayCities.add(meal.citySlug);
        meals = [{ poiId: meal.poiId, startTime: '', endTime: '', whyThisFits: '' }];
      }
    }
    const keptSights = sightsOn().slice(0, Math.max(1, slotBudget - meals.length));
    day.picks = [...keptSights, ...meals];
    assignTimes(day, byId, slotBudget);
  }

  const totalPicks = days.reduce((sum, day) => sum + day.picks.length, 0);
  if (totalPicks === 0) return null;

  return { summary: asString(root.summary), days };
}

/**
 * Finds an eating place for a day that has none. Prefers a fresh place in one of
 * the day's cities, then relaxes uniqueness, then the city limit, so a day always
 * ends up with somewhere to eat even when the pool is thin.
 */
function findDayMeal(
  mealPool: CompactCandidate[],
  usedToday: Set<string>,
  usedMeals: Set<string>,
  dayCities: Set<string>,
): CompactCandidate | null {
  const free = (c: CompactCandidate): boolean => !usedToday.has(c.poiId);
  const fresh = (c: CompactCandidate): boolean => !usedMeals.has(c.poiId);
  const inCity = (c: CompactCandidate): boolean =>
    dayCities.size === 0 || !c.citySlug || dayCities.has(c.citySlug);
  return (
    mealPool.find((c) => free(c) && fresh(c) && inCity(c)) ??
    mealPool.find((c) => free(c) && inCity(c)) ??
    mealPool.find((c) => free(c) && fresh(c)) ??
    mealPool.find(free) ??
    mealPool[0] ??
    null
  );
}

/** Drops eating places beyond `cap`, keeping the earliest, and frees the rest for other days. */
function trimMeals(
  day: ResolvedDay,
  cap: number,
  isMeal: (poiId: string) => boolean,
  usedMeals: Set<string>,
): void {
  let kept = 0;
  day.picks = day.picks.filter((pick) => {
    if (!isMeal(pick.poiId)) return true;
    kept += 1;
    if (kept <= cap) return true;
    usedMeals.delete(pick.poiId);
    return false;
  });
}

/** Orders a day's picks (meal in the middle) and hands out non-overlapping slots. */
function assignTimes(
  day: ResolvedDay,
  byId: Map<string, CompactCandidate>,
  maxStops: number,
): void {
  const ordered = day.picks
    .slice(0, Math.min(maxStops, SLOTS.length))
    .map((pick, index) => ({ pick, index }))
    .sort((a, b) => sortKey(a, byId) - sortKey(b, byId))
    .map((entry, position) => {
      const slot = SLOTS[position] ?? SLOTS[SLOTS.length - 1] ?? ['09:00', '10:30'];
      return { ...entry.pick, startTime: slot[0], endTime: slot[1] };
    });
  day.picks = ordered;
}

function sortKey(
  entry: { pick: ResolvedPick; index: number },
  byId: Map<string, CompactCandidate>,
): number {
  if (byId.get(entry.pick.poiId)?.isMeal) return NOON_MINUTES;
  const parsed = TIME.test(entry.pick.startTime) ? toMinutes(entry.pick.startTime) : 0;
  // keep model ordering when it left no usable time
  return parsed || entry.index * 60 + 6 * 60;
}
