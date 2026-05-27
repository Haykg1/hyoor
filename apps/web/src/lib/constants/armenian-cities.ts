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

export const QUICK_DESTINATIONS: ArmenianCity[] = ['Yerevan', 'Dilijan', 'Tsaghkadzor', 'Sevan'];
