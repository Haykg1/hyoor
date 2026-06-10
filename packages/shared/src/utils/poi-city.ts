const YEREVAN_CITY_ALIASES = new Set(['yerevan', 'երևան', 'եռևան', 'ереван']);
const YEREVAN_REGION_ALIASES = new Set(['yerevan', 'երևան', 'ереван']);

const CITY_SLUG_ALIASES: Record<string, string> = {
  yerevan: 'yerevan',
  երևան: 'yerevan',
  եռևան: 'yerevan',
  ереван: 'yerevan',
  gyumri: 'gyumri',
  գյումրի: 'gyumri',
  гюмри: 'gyumri',
  vagharshapat: 'vagharshapat',
  վաղարշապատ: 'vagharshapat',
  вагаршапат: 'vagharshapat',
  etchmiadzin: 'vagharshapat',
  dilijan: 'dilijan',
  դիլիջան: 'dilijan',
  дилижан: 'dilijan',
  tsakhkadzor: 'tsakhkadzor',
  tsaghkadzor: 'tsakhkadzor',
  ծաղկաձոր: 'tsakhkadzor',
  цахкадзор: 'tsakhkadzor',
  sevan: 'sevan',
  սևան: 'sevan',
  севан: 'sevan',
  goris: 'goris',
  գորիս: 'goris',
  горис: 'goris',
  kapan: 'kapan',
  կապան: 'kapan',
  капан: 'kapan',
  vanadzor: 'vanadzor',
  վանաձոր: 'vanadzor',
  ванадзор: 'vanadzor',
  alaverdi: 'alaverdi',
  ալավերդի: 'alaverdi',
  алаверди: 'alaverdi',
  stepanavan: 'stepanavan',
  ստեփանավան: 'stepanavan',
  степанаван: 'stepanavan',
  abovyan: 'abovyan',
  աբովյան: 'abovyan',
  абовян: 'abovyan',
  hrazdan: 'hrazdan',
  հրազդան: 'hrazdan',
  раздан: 'hrazdan',
  artashat: 'artashat',
  արտաշատ: 'artashat',
  арташат: 'artashat',
  yeghegnadzor: 'yeghegnadzor',
  եղեգնաձոր: 'yeghegnadzor',
  ехегнадзор: 'yeghegnadzor',
  meghri: 'meghri',
  մեղրի: 'meghri',
  мегри: 'meghri',
  armavir: 'armavir',
  արմավիր: 'armavir',
  армавир: 'armavir',
  gavar: 'gavar',
  գավառ: 'gavar',
  гавар: 'gavar',
};

const DESTINATION_CITY_SLUGS = new Set([
  'yerevan',
  'gyumri',
  'vagharshapat',
  'dilijan',
  'tsakhkadzor',
  'sevan',
  'goris',
  'kapan',
  'vanadzor',
  'alaverdi',
  'stepanavan',
  'abovyan',
  'hrazdan',
  'artashat',
  'yeghegnadzor',
  'meghri',
  'armavir',
  'gavar',
]);

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function slugifyCity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function resolveSlugFromToken(token: string): string | null {
  if (!token) return null;
  const alias = CITY_SLUG_ALIASES[token];
  if (alias) return alias;
  const slug = slugifyCity(token);
  if (DESTINATION_CITY_SLUGS.has(slug)) return slug;
  return null;
}

export function normalizePoiCitySlug(
  city: string | null | undefined,
  region?: string | null,
): string | null {
  const cityToken = normalizeToken(city);
  const regionToken = normalizeToken(region);
  if (YEREVAN_CITY_ALIASES.has(cityToken) || YEREVAN_REGION_ALIASES.has(regionToken)) {
    return 'yerevan';
  }
  const fromCity = resolveSlugFromToken(cityToken);
  if (fromCity) return fromCity;
  const fromRegion = resolveSlugFromToken(regionToken);
  if (fromRegion) return fromRegion;
  return null;
}

export function resolveDestinationCitySlug(
  city: string | null | undefined,
  region?: string | null,
): string | null {
  return normalizePoiCitySlug(city, region);
}

export function buildPoiGeoKey(category: string, citySlug: string): string {
  return `poi:${category}:${citySlug}`;
}

export function buildPoiMetaKey(category: string, citySlug: string): string {
  return `poi:${category}:${citySlug}:meta`;
}

export function buildDestinationGeoKey(citySlug: string): string {
  return `poi:destinations:${citySlug}`;
}

export function buildDestinationMetaKey(citySlug: string): string {
  return `poi:destinations:${citySlug}:meta`;
}
