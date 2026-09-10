import type { TripPlanItemKind } from '@repo/shared';
import { POI_MEAL_CATEGORIES } from '@repo/shared';

const MEAL_CATEGORIES = new Set<string>(POI_MEAL_CATEGORIES);
const KIND_BY_CATEGORY: Record<string, TripPlanItemKind> = {
  church: 'sight',
  landmark: 'sight',
  monument: 'sight',
  memorial: 'sight',
  museum: 'sight',
  viewpoint: 'sight',
  park: 'sight',
  market: 'activity',
  winery: 'activity',
  gastrobar: 'activity',
  pub: 'activity',
  factory: 'activity',
};

export function kindFor(category: string): TripPlanItemKind {
  if (MEAL_CATEGORIES.has(category)) return 'meal';
  return KIND_BY_CATEGORY[category] ?? 'sight';
}

export function isMealCategory(category: string): boolean {
  return MEAL_CATEGORIES.has(category);
}
