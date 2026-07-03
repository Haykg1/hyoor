import type { AmenityInput } from '../dto/property';

export interface AmenityCatalogItem extends AmenityInput {
  key: string;
  pinned?: boolean;
}

export const AMENITIES_CATALOG: AmenityCatalogItem[] = [
  { key: 'wifi', name: 'WiFi', category: 'Essentials', iconKey: 'wifi', pinned: true },
  { key: 'wifi_1gbps', name: 'WiFi (1 Gbps)', category: 'Essentials', iconKey: 'wifi' },
  { key: 'heating', name: 'Heating', category: 'Essentials', iconKey: 'heating', pinned: true },
  { key: 'washer', name: 'Washer', category: 'Essentials', iconKey: 'washer', pinned: true },
  { key: 'washing_machine', name: 'Washing machine', category: 'Laundry', iconKey: 'washer' },
  { key: 'dryer', name: 'Dryer', category: 'Essentials', iconKey: 'dryer', pinned: true },
  {
    key: 'iron_ironing_board',
    name: 'Iron & ironing board',
    category: 'Essentials',
    iconKey: 'iron',
  },
  { key: 'parking', name: 'Free parking', category: 'Essentials', iconKey: 'parking' },
  { key: 'private_parking', name: 'Private parking', category: 'Parking', iconKey: 'parking' },
  { key: 'kitchen', name: 'Kitchen', category: 'Essentials', iconKey: 'kitchen' },
  { key: 'full_kitchen', name: 'Full kitchen', category: 'Kitchen', iconKey: 'kitchen' },
  { key: 'kitchenette', name: 'Kitchenette', category: 'Kitchen', iconKey: 'kitchen' },
  { key: 'shared_kitchen', name: 'Shared kitchen', category: 'Kitchen', iconKey: 'kitchen' },
  { key: 'ac', name: 'Air conditioning', category: 'Essentials', iconKey: 'ac' },
  { key: 'elevator', name: 'Elevator', category: 'Building', iconKey: 'elevator' },
  { key: 'tv', name: 'TV', category: 'Entertainment', iconKey: 'tv' },
  { key: 'smart_tv', name: 'Smart TV', category: 'Entertainment', iconKey: 'tv' },
  { key: 'smart_tv_4k', name: 'Smart TV 4K', category: 'Entertainment', iconKey: 'tv' },
  { key: 'board_games', name: 'Board games', category: 'Entertainment', iconKey: 'games' },
  { key: 'pool', name: 'Pool', category: 'Outdoor', iconKey: 'pool' },
  { key: 'gym', name: 'Gym', category: 'Facilities', iconKey: 'gym' },
  { key: 'gym_access', name: 'Gym access', category: 'Wellness', iconKey: 'gym' },
  { key: 'jacuzzi', name: 'Jacuzzi', category: 'Wellness', iconKey: 'jacuzzi' },
  { key: 'balcony', name: 'Balcony', category: 'Outdoor', iconKey: 'balcony' },
  { key: 'garden', name: 'Garden', category: 'Outdoor', iconKey: 'garden' },
  { key: 'bbq', name: 'BBQ grill', category: 'Outdoor', iconKey: 'bbq' },
  { key: 'rooftop_terrace', name: 'Rooftop terrace', category: 'Outdoor', iconKey: 'terrace' },
  { key: 'outdoor_terrace', name: 'Outdoor terrace', category: 'Outdoor', iconKey: 'terrace' },
  { key: 'fireplace', name: 'Fireplace', category: 'Indoor', iconKey: 'fireplace' },
  { key: 'city_view', name: 'City view', category: 'Views', iconKey: 'view' },
  { key: 'mountain_view', name: 'Mountain view', category: 'Views', iconKey: 'view' },
  { key: 'panoramic_city_view', name: 'Panoramic city view', category: 'Views', iconKey: 'view' },
  { key: 'forest_view', name: 'Forest view', category: 'Views', iconKey: 'view' },
  { key: 'workspace_desk', name: 'Workspace desk', category: 'Work', iconKey: 'desk' },
  { key: 'baby_cot', name: 'Baby cot available', category: 'Family', iconKey: 'baby' },
  {
    key: 'breakfast_available',
    name: 'Breakfast available',
    category: 'Food',
    iconKey: 'breakfast',
  },
  { key: 'check_in_24h', name: '24h check-in', category: 'Service', iconKey: 'check-in' },
  {
    key: 'concierge_service',
    name: 'Concierge service',
    category: 'Service',
    iconKey: 'concierge',
  },
  { key: 'luggage_storage', name: 'Luggage storage', category: 'Service', iconKey: 'luggage' },
  { key: 'tour_desk', name: 'Tour desk', category: 'Service', iconKey: 'tour' },
  { key: 'common_area', name: 'Common area', category: 'Facilities', iconKey: 'common-area' },
  {
    key: 'city_centre_location',
    name: 'City centre location',
    category: 'Location',
    iconKey: 'location',
  },
  { key: 'pets', name: 'Pet friendly', category: 'Rules', iconKey: 'pets' },
];

export const AMENITY_NAMES = AMENITIES_CATALOG.map((a) => a.name);

export const PINNED_AMENITY_KEYS = AMENITIES_CATALOG.filter((a) => a.pinned).map((a) => a.key);
