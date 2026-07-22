import type { CurrencyRatesPayload } from '@repo/shared';

import { convertCurrencyAmount } from '@/lib/currency/convert';
import { majorToMinor } from '@/lib/format/money';

/** Typed display amount (major units) → settlement minor integer for the availability API. */
export function toSettlementAmount(
  displayMajor: number,
  displayCurrency: string,
  settlementCurrency: string,
  rates: CurrencyRatesPayload | null,
): number | null {
  const converted = convertCurrencyAmount(displayMajor, displayCurrency, settlementCurrency, rates);
  if (converted === null) return null;
  return majorToMinor(converted, settlementCurrency);
}
