import { computeDistanceMeters } from '@repo/shared';

export interface RoutePoint {
  lat: number;
  lng: number;
}

const MEAL_START_PENALTY_M = 50_000;
const MEAL_END_PENALTY_M = 25_000;

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) result.push([items[i] as T, ...perm]);
  }
  return result;
}

/**
 * Reorders a day's stops (max 3–4) to minimise walking distance, optionally
 * anchored to the stay, and keeps meal stops off the first/last slot so the day
 * reads "see something → eat → see something".
 */
export function optimizeVisitOrder<T extends { lat: number; lng: number; isMeal: boolean }>(
  stops: T[],
  anchor: RoutePoint | null,
): T[] {
  if (stops.length < 2) return stops;
  const indices = stops.map((_, index) => index);
  let bestOrder = indices;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const perm of permutations(indices)) {
    let cost = 0;
    const first = stops[perm[0] as number];
    if (anchor && first) {
      cost += computeDistanceMeters(anchor.lat, anchor.lng, first.lat, first.lng);
    }
    for (let i = 1; i < perm.length; i += 1) {
      const a = stops[perm[i - 1] as number];
      const b = stops[perm[i] as number];
      if (a && b) cost += computeDistanceMeters(a.lat, a.lng, b.lat, b.lng);
    }
    if (perm.length >= 2 && first?.isMeal) cost += MEAL_START_PENALTY_M;
    const last = stops[perm[perm.length - 1] as number];
    if (perm.length >= 3 && last?.isMeal) cost += MEAL_END_PENALTY_M;
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = perm;
    }
  }
  return bestOrder.map((index) => stops[index] as T);
}
