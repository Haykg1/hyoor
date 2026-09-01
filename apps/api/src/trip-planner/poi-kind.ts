import type { TripPlanItemKind } from '@repo/shared';

const KIND_BY_CATEGORY: Record<string, TripPlanItemKind> = {
  church: 'sight',
  landmark: 'sight',
  monument: 'sight',
  memorial: 'sight',
  museum: 'sight',
  viewpoint: 'sight',
  park: 'sight',
  restaurant: 'meal',
  cafe: 'meal',
  market: 'activity',
  winery: 'activity',
  gastrobar: 'activity',
  pub: 'activity',
  factory: 'activity',
};

export function kindFor(category: string): TripPlanItemKind {
  return KIND_BY_CATEGORY[category] ?? 'sight';
}

export function isMealCategory(category: string): boolean {
  return kindFor(category) === 'meal';
}
