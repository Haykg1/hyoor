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
const NOON_MINUTES = 12 * 60;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLOTS: [string, string][] = [
  ['09:00', '10:30'],
  ['10:45', '12:00'],
  ['12:30', '14:00'],
  ['14:30', '16:00'],
  ['16:15', '17:45'],
  ['19:00', '20:30'],
];

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
    const picks: ResolvedPick[] = [];
    for (const rawPick of rawPicks) {
      const pickRecord = asRecord(rawPick);
      if (!pickRecord) continue;
      const candidate = resolveCandidate(pickRecord, byNumber, byId);
      if (!candidate || !notBlocked(candidate)) continue;
      if (usedToday.has(candidate.poiId)) continue; // no place twice on one day
      if (candidate.isMeal && strictMeals && usedMeals.has(candidate.poiId)) continue;
      const startTime = asString(pickRecord.startTime);
      const endTime = asString(pickRecord.endTime);
      if (!TIME.test(startTime) || !TIME.test(endTime)) continue;
      if (toMinutes(endTime) <= toMinutes(startTime)) continue;
      usedToday.add(candidate.poiId);
      if (candidate.isMeal) usedMeals.add(candidate.poiId);
      picks.push({
        poiId: candidate.poiId,
        startTime,
        endTime,
        whyThisFits: asString(pickRecord.whyThisFits).slice(0, 280),
      });
    }
    picks.sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime));
    days.push({ theme, picks: picks.slice(0, maxStops) });
  }

  while (days.length < nights) days.push({ theme: 'Day plan', picks: [] });

  let sightCursor = 0;
  for (const day of days) {
    const usedToday = new Set(day.picks.map((pick) => pick.poiId));
    // Fill sparse days with sights, leaving one slot for a meal.
    const target = Math.max(1, maxStops - 1);
    for (let guard = 0; day.picks.length < target && guard < sightPool.length * 2; guard += 1) {
      const candidate = sightPool[sightCursor % sightPool.length];
      sightCursor += 1;
      if (!candidate || usedToday.has(candidate.poiId)) continue;
      usedToday.add(candidate.poiId);
      day.picks.push({ poiId: candidate.poiId, startTime: '', endTime: '', whyThisFits: '' });
    }
    // Every day needs at least one eating place.
    const hasMeal = day.picks.some((pick) => byId.get(pick.poiId)?.isMeal);
    if (!hasMeal) {
      let meal = mealPool.find(
        (candidate) => !usedToday.has(candidate.poiId) && !usedMeals.has(candidate.poiId),
      );
      if (!meal && !strictMeals) {
        meal = mealPool.find((candidate) => !usedToday.has(candidate.poiId));
      }
      if (meal) {
        usedMeals.add(meal.poiId);
        if (day.picks.length >= maxStops) day.picks.pop();
        day.picks.push({ poiId: meal.poiId, startTime: '', endTime: '', whyThisFits: '' });
      }
    }
    assignTimes(day, byId, maxStops);
  }

  const totalPicks = days.reduce((sum, day) => sum + day.picks.length, 0);
  if (totalPicks === 0) return null;

  return { summary: asString(root.summary), days };
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
