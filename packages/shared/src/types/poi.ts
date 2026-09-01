export const MAX_FEATURED_POIS = 5;

export const POI_DESTINATION_CATEGORIES = [
  'landmark',
  'museum',
  'park',
  'market',
  'memorial',
  'church',
  'viewpoint',
  'restaurant',
  'cafe',
  'gastrobar',
  'pub',
  'winery',
  'factory',
] as const;

export type PoiDestinationCategory = (typeof POI_DESTINATION_CATEGORIES)[number];

export interface PoiNameLabels {
  en: string;
  hy: string;
  ru: string;
}

export interface PoiStation {
  id: string;
  sortOrder: number;
  category: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  nameLabels: PoiNameLabels;
}

export interface PoiDestination extends PoiStation {
  wikipediaTitle?: string;
  wikipediaUrl?: string;
}

export interface PoiDataset {
  citySlug: string;
  city: string;
  region: string;
  country: string;
  category: string;
  stations: PoiStation[];
}

export interface DestinationDataset {
  citySlug: string;
  city: string;
  region: string;
  country: string;
  destinations: PoiDestination[];
}

export interface NearestMetroStation {
  id: string;
  nameLabels: PoiNameLabels;
  latitude: number;
  longitude: number;
}

export interface NearestMetroResponse {
  station: NearestMetroStation | null;
  distanceMeters: number | null;
  distanceKm: number | null;
  approximate: true;
}

export interface NearbyPoiItem {
  id: string;
  category: string;
  nameLabels: PoiNameLabels;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceKm: number;
}

export interface NearbyPoisResponse {
  citySlug: string | null;
  pois: NearbyPoiItem[];
}

export interface PropertyFeaturedPoiView {
  id: string;
  sortOrder: number;
  category: string;
  nameLabels: PoiNameLabels;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceKm: number;
}

export const POI_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type PoiStatus = (typeof POI_STATUSES)[number];

export const POI_PRICE_BANDS = ['budget', 'mid', 'upscale'] as const;
export type PoiPriceBand = (typeof POI_PRICE_BANDS)[number];

export const POI_PLANNER_TAGS = [
  'active',
  'relaxed',
  'alcohol',
  'historical',
  'modern',
  'food',
  'nature',
  'culture',
  'nightlife',
] as const;
export type PoiPlannerTag = (typeof POI_PLANNER_TAGS)[number];

export interface PoiDescriptionLabels {
  en: string;
  hy: string;
  ru: string;
}

export interface PoiAttributes {
  averageMealAmd?: number;
  priceBand?: PoiPriceBand;
  servesAlcohol?: boolean;
  typicalDurationMin?: number;
  openingHoursNote?: string;
  website?: string;
  websiteMenu?: string;
  phone?: string;
}

export type PoiAttributeField = keyof PoiAttributes;

const FOOD_DRINK_CATEGORIES = ['restaurant', 'cafe', 'gastrobar', 'pub', 'winery'];

/** Which attribute fields make sense for a category (drives the admin form). */
const POI_ATTRIBUTE_FIELD_CATEGORIES: Record<PoiAttributeField, readonly string[] | 'all'> = {
  typicalDurationMin: 'all',
  openingHoursNote: 'all',
  website: 'all',
  averageMealAmd: FOOD_DRINK_CATEGORIES,
  websiteMenu: FOOD_DRINK_CATEGORIES,
  servesAlcohol: FOOD_DRINK_CATEGORIES,
  priceBand: [...FOOD_DRINK_CATEGORIES, 'museum', 'factory'],
  phone: [...FOOD_DRINK_CATEGORIES, 'museum', 'church', 'market', 'factory'],
};

export function poiAttributeFieldVisible(field: PoiAttributeField, category: string): boolean {
  const allowed = POI_ATTRIBUTE_FIELD_CATEGORIES[field];
  return allowed === 'all' || allowed.includes(category);
}

/** Strips attribute values that don't belong to the category. */
export function prunePoiAttributes(attributes: PoiAttributes, category: string): PoiAttributes {
  const out: PoiAttributes = {};
  for (const key of Object.keys(attributes) as PoiAttributeField[]) {
    if (poiAttributeFieldVisible(key, category) && attributes[key] !== undefined) {
      out[key] = attributes[key] as never;
    }
  }
  return out;
}

export const POI_PHOTO_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const;
export type PoiPhotoStatus = (typeof POI_PHOTO_STATUSES)[number];

export interface PoiPhotoView {
  id: string;
  key: string;
  url: string | null;
  sortOrder: number;
  status: PoiPhotoStatus;
  attribution: string | null;
  license: string | null;
  sourceUrl: string | null;
}

export interface PoiCityOption {
  citySlug: string;
  city: string;
  region: string;
}

export interface AdminPoi {
  id: string;
  city: string;
  region: string;
  country: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  category: string;
  tags: string[];
  nameLabels: PoiNameLabels;
  descriptionLabels: PoiDescriptionLabels;
  wikipediaTitle: string | null;
  wikipediaUrl: string | null;
  attributes: PoiAttributes;
  status: PoiStatus;
  usableInPlanner: boolean;
  sortOrder: number;
  photos: PoiPhotoView[];
  createdAt: string;
  updatedAt: string;
}
