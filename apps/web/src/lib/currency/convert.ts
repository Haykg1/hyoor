import type { CurrencyRatesPayload } from '@repo/shared';

/**
 * Cross-rate conversion via the USD pivot (`rates` values are units of X per 1 USD).
 * Mirrors `CurrencyService.convert` on the API.
 */
export function convertCurrencyAmount(
  amount: number,
  from: string,
  to: string,
  rates: CurrencyRatesPayload | null,
): number | null {
  if (from === to) return amount;
  if (!rates) return null;
  const fromRate = from === rates.base ? 1 : rates.rates[from];
  const toRate = to === rates.base ? 1 : rates.rates[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}
