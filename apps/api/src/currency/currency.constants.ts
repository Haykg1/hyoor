import { HostSettlementCurrencies } from '@repo/shared';

/** Currencies eligible for the guest-facing cosmetic estimate. Never charged — display only. */
export const GUEST_DISPLAY_CURRENCIES = [
  'AMD',
  'RUB',
  'GEL',
  'BYN',
  'UAH',
  'PLN',
  'EUR',
  'GBP',
  'TRY',
] as const;
export type GuestDisplayCurrency = (typeof GUEST_DISPLAY_CURRENCIES)[number];

/** Fallback for guests outside the curated display map. */
export const DEFAULT_DISPLAY_CURRENCY = 'USD';

/** Superset of currencies kept in the Redis-cached rate table. */
export const CACHED_CURRENCIES = Array.from(
  new Set<string>([...HostSettlementCurrencies, ...GUEST_DISPLAY_CURRENCIES, 'USD']),
);

export const CURRENCY_RATES_CACHE_KEY = 'currency:rates:v1';
export const CURRENCY_RATES_CACHE_TTL_SECONDS = 90_000;

const EU_EUR_COUNTRIES = new Set([
  'DE',
  'FR',
  'ES',
  'IT',
  'NL',
  'BE',
  'AT',
  'IE',
  'PT',
  'FI',
  'GR',
  'LU',
  'SK',
  'SI',
  'EE',
  'LV',
  'LT',
  'CY',
  'MT',
  'HR',
]);

const COUNTRY_TO_DISPLAY_CURRENCY: Record<string, GuestDisplayCurrency> = {
  AM: 'AMD',
  RU: 'RUB',
  GE: 'GEL',
  BY: 'BYN',
  UA: 'UAH',
  PL: 'PLN',
  GB: 'GBP',
  TR: 'TRY',
};

/** Resolves a guest's ISO-3166 country code to a curated display currency, or the USD fallback. */
export function resolveDisplayCurrencyForCountry(countryCode: string | null): string {
  if (!countryCode) return DEFAULT_DISPLAY_CURRENCY;
  const upper = countryCode.toUpperCase();
  if (EU_EUR_COUNTRIES.has(upper)) return 'EUR';
  return COUNTRY_TO_DISPLAY_CURRENCY[upper] ?? DEFAULT_DISPLAY_CURRENCY;
}
