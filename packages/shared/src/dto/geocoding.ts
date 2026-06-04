export interface PlaceResult {
  name: string;
  fullName: string;
  description: string;
  lat: number;
  lng: number;
  country: string;
  region: string | null;
  city: string | null;
  street: string | null;
  buildingNumber: string | null;
  formattedAddress: string;
  placeKind: string;
}

export interface SearchPlacesResponse {
  places: PlaceResult[];
}

export type GeocodingSearchLevel = 'house' | 'any';

export const GeocodingSearchLevels = ['house', 'any'] as const;

export const YandexGeocodingLangs = ['hy_AM', 'ru_RU', 'en_US'] as const;
export type YandexGeocodingLang = (typeof YandexGeocodingLangs)[number];

export function localeToYandexLang(locale: string): YandexGeocodingLang {
  if (locale === 'hy') return 'hy_AM';
  if (locale === 'ru') return 'ru_RU';
  return 'en_US';
}

export interface AddressLabel {
  city: string | null;
  region: string | null;
  street: string | null;
  formattedAddress: string;
}

export const AddressLocales = ['hy', 'ru', 'en'] as const;
export type AddressLocale = (typeof AddressLocales)[number];

export type PropertyAddressLabels = Record<AddressLocale, AddressLabel>;

export function placeResultToAddressLabel(place: PlaceResult): AddressLabel {
  return {
    city: place.city,
    region: place.region,
    street: place.street,
    formattedAddress: place.formattedAddress,
  };
}

export function getLocalizedAddress(
  labels: PropertyAddressLabels | null | undefined,
  locale: string,
  fallback: AddressLabel,
): AddressLabel {
  const key = locale as AddressLocale;
  if (labels?.[key]?.formattedAddress) {
    return labels[key];
  }
  if (labels?.en?.formattedAddress) {
    return labels.en;
  }
  return fallback;
}

/**
 * Optional per-locale translations for a property title.
 * Mirrors {@link PropertyAddressLabels}: every locale is optional and missing
 * keys fall back to the canonical `title` column.
 */
export type PropertyTitleLabels = Partial<Record<AddressLocale, string>>;

/**
 * Returns the best-matching localized title:
 *   1. labels[locale] if non-empty
 *   2. labels.en if non-empty
 *   3. the canonical `fallback` title (host's primary language input).
 */
export function getLocalizedTitle(
  labels: PropertyTitleLabels | null | undefined,
  locale: string,
  fallback: string,
): string {
  const key = locale as AddressLocale;
  const exact = labels?.[key]?.trim();
  if (exact) return exact;
  const english = labels?.en?.trim();
  if (english) return english;
  return fallback;
}
