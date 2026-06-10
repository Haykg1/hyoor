export const YEREVAN_REGION = 'Yerevan';

export const ARMENIA_MARZER = [
  'Aragatsotn',
  'Ararat',
  'Armavir',
  'Gegharkunik',
  'Kotayk',
  'Lori',
  'Shirak',
  'Syunik',
  'Tavush',
  'Vayots Dzor',
] as const;

export type ArmeniaMarz = (typeof ARMENIA_MARZER)[number];

export const ARMENIA_REGION_OPTIONS = [YEREVAN_REGION, ...ARMENIA_MARZER] as const;

export type ArmeniaRegionOption = (typeof ARMENIA_REGION_OPTIONS)[number];

export interface ArmeniaRegionDefinition {
  region: ArmeniaRegionOption;
  cities: readonly string[];
}

export const ARMENIA_REGIONS: readonly ArmeniaRegionDefinition[] = [
  { region: YEREVAN_REGION, cities: ['Yerevan'] },
  { region: 'Aragatsotn', cities: ['Ashtarak', 'Aparan', 'Talin'] },
  { region: 'Ararat', cities: ['Artashat', 'Ararat', 'Masis', 'Vedi'] },
  {
    region: 'Armavir',
    cities: ['Armavir', 'Vagharshapat', 'Etchmiadzin', 'Metsamor'],
  },
  { region: 'Gegharkunik', cities: ['Gavar', 'Sevan', 'Martuni', 'Vardenis', 'Chambarak'] },
  {
    region: 'Kotayk',
    cities: [
      'Hrazdan',
      'Abovyan',
      'Charentsavan',
      'Yeghvard',
      'Nor Hachn',
      'Byureghavan',
      'Tsaghkadzor',
    ],
  },
  {
    region: 'Lori',
    cities: ['Vanadzor', 'Alaverdi', 'Stepanavan', 'Spitak', 'Tashir', 'Akhtala', 'Tumanyan'],
  },
  { region: 'Shirak', cities: ['Gyumri', 'Artik', 'Maralik'] },
  {
    region: 'Syunik',
    cities: ['Kapan', 'Goris', 'Sisian', 'Kajaran', 'Meghri', 'Agarak', 'Dastakert'],
  },
  { region: 'Tavush', cities: ['Ijevan', 'Dilijan', 'Berd', 'Noyemberyan', 'Ayrum'] },
  { region: 'Vayots Dzor', cities: ['Yeghegnadzor', 'Jermuk', 'Vayk'] },
] as const;

export const ARMENIA_CITIES = [
  ...new Set(ARMENIA_REGIONS.flatMap((entry) => [...entry.cities])),
].sort((a, b) => a.localeCompare(b));

export const CITY_SEARCH_ALIASES: Record<string, readonly string[]> = {
  Vagharshapat: ['Vagharshapat', 'Etchmiadzin'],
  Etchmiadzin: ['Vagharshapat', 'Etchmiadzin'],
};

export function getCitiesForRegions(regions: readonly string[]): string[] {
  if (regions.length === 0) return [...ARMENIA_CITIES];
  const selected = new Set(regions);
  const cities = ARMENIA_REGIONS.filter((entry) => selected.has(entry.region)).flatMap(
    (entry) => entry.cities,
  );
  return [...new Set(cities)].sort((a, b) => a.localeCompare(b));
}

export function expandCityFilterValues(cities: readonly string[]): string[] {
  const expanded = new Set<string>();
  for (const city of cities) {
    const aliases = CITY_SEARCH_ALIASES[city];
    if (aliases) {
      for (const alias of aliases) expanded.add(alias);
    } else {
      expanded.add(city);
    }
  }
  return [...expanded];
}
