/**
 * Canonical list of cities used across search inputs, datalists and chips.
 * Order in QUICK_DESTINATIONS controls the home-page chip order.
 */
export const ARMENIAN_CITIES = [
  'Yerevan',
  'Gyumri',
  'Vanadzor',
  'Dilijan',
  'Jermuk',
  'Goris',
  'Sevan',
  'Tsaghkadzor',
  'Kapan',
  'Alaverdi',
  'Stepanavan',
  'Sisian',
  'Hrazdan',
  'Abovyan',
  'Meghri',
] as const;

export type ArmenianCity = (typeof ARMENIAN_CITIES)[number];

export interface QuickDestination {
  name: ArmenianCity;
  image: string;
  alt: string;
}

export const QUICK_DESTINATIONS: QuickDestination[] = [
  {
    name: 'Yerevan',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1e280de1d-1775415435647.png',
    alt: 'Yerevan cityscape with Mount Ararat at sunset',
  },
  {
    name: 'Dilijan',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_17068a300-1784032337886.png',
    alt: 'Lush green forests of Dilijan National Park',
  },
  {
    name: 'Tsaghkadzor',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1050cddcc-1784032338171.png',
    alt: 'Snow-covered mountains and ski slopes in Tsaghkadzor',
  },
  {
    name: 'Sevan',
    image: 'https://images.unsplash.com/photo-1667370291751-7319e8b44f90',
    alt: 'Blue waters of Lake Sevan with mountains in background',
  },
  {
    name: 'Gyumri',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1ce61f6bb-1784032337901.png',
    alt: 'Historic black tuff stone buildings in Gyumri old quarter',
  },
];
