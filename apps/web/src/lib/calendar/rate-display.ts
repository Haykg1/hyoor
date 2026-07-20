import type { CurrencyRatesPayload } from '@repo/shared';

import { convertCurrencyAmount } from '@/lib/currency/convert';

export function parseRateInput(text: string): number | null {
  const n = Number(text.replace(/[^\d]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Display amount → settlement integer for the availability API. */
export function toSettlementAmount(
  displayAmount: number,
  displayCurrency: string,
  settlementCurrency: string,
  rates: CurrencyRatesPayload | null,
): number | null {
  const converted = convertCurrencyAmount(
    displayAmount,
    displayCurrency,
    settlementCurrency,
    rates,
  );
  if (converted === null) return null;
  return Math.round(converted);
}
