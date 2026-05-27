import type { AmenityInput } from '@repo/shared';

export interface AmenityCatalogItem extends AmenityInput {
  key: string;
  pinned?: boolean;
}

export const AMENITIES_CATALOG: AmenityCatalogItem[] = [
  { key: 'wifi', name: 'WiFi', category: 'Essentials', iconKey: 'wifi', pinned: true },
  { key: 'heating', name: 'Heating', category: 'Essentials', iconKey: 'heating', pinned: true },
  { key: 'washer', name: 'Washer', category: 'Essentials', iconKey: 'washer', pinned: true },
  { key: 'dryer', name: 'Dryer', category: 'Essentials', iconKey: 'dryer', pinned: true },
  { key: 'parking', name: 'Free parking', category: 'Essentials', iconKey: 'parking' },
  { key: 'kitchen', name: 'Kitchen', category: 'Essentials', iconKey: 'kitchen' },
  { key: 'ac', name: 'Air conditioning', category: 'Essentials', iconKey: 'ac' },
  { key: 'tv', name: 'TV', category: 'Entertainment', iconKey: 'tv' },
  { key: 'pool', name: 'Pool', category: 'Outdoor', iconKey: 'pool' },
  { key: 'gym', name: 'Gym', category: 'Facilities', iconKey: 'gym' },
  { key: 'balcony', name: 'Balcony', category: 'Outdoor', iconKey: 'balcony' },
  { key: 'garden', name: 'Garden', category: 'Outdoor', iconKey: 'garden' },
  { key: 'bbq', name: 'BBQ grill', category: 'Outdoor', iconKey: 'bbq' },
  { key: 'fireplace', name: 'Fireplace', category: 'Indoor', iconKey: 'fireplace' },
  { key: 'pets', name: 'Pet friendly', category: 'Rules', iconKey: 'pets' },
];

export const PINNED_AMENITY_KEYS = AMENITIES_CATALOG.filter((a) => a.pinned).map((a) => a.key);
