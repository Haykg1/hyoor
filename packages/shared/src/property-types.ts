import type { PropertyType } from './types/index';

/** i18n slug for each `PropertyType` (e.g. `property_card.categories.{slug}`) */
export const PROPERTY_TYPE_LABEL_KEYS = {
  APARTMENT: 'apartment',
  STUDIO: 'studio',
  HOUSE: 'house',
  VILLA: 'villa',
  GUESTHOUSE: 'guesthouse',
  HOTEL_ROOM: 'hotel_room',
  OTHER: 'other',
} as const satisfies Record<PropertyType, string>;

export type PropertyTypeLabelKey = (typeof PROPERTY_TYPE_LABEL_KEYS)[PropertyType];

export function propertyTypeLabelKey(type: PropertyType): PropertyTypeLabelKey {
  return PROPERTY_TYPE_LABEL_KEYS[type];
}

/** Marketplace filter buckets (home featured, search chips) */
export const PropertyFilterCategories = ['apartment', 'house', 'villa', 'guesthouse'] as const;
export type PropertyFilterCategory = (typeof PropertyFilterCategories)[number];

export function propertyTypeToFilterCategory(type: PropertyType): PropertyFilterCategory {
  switch (type) {
    case 'HOUSE':
      return 'house';
    case 'VILLA':
      return 'villa';
    case 'GUESTHOUSE':
      return 'guesthouse';
    default:
      return 'apartment';
  }
}
