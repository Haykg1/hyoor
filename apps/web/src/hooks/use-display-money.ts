'use client';

import type { CurrencyRatesPayload, SearchDisplayCurrency } from '@repo/shared';
import { useEffect } from 'react';

import { convertCurrencyAmount } from '@/lib/currency/convert';
import { formatCurrencyAmount } from '@/lib/format/price';
import { useDisplayCurrencyStore } from '@/store/display-currency.store';

interface UseDisplayMoneyResult {
  displayCurrency: SearchDisplayCurrency;
  setDisplayCurrency: (currency: SearchDisplayCurrency) => void;
  rates: CurrencyRatesPayload | null;
  ratesReady: boolean;
  /** Convert `amount` from `fromCurrency` into the active display currency (or null if FX unavailable). */
  convert: (amount: number, fromCurrency: string) => number | null;
  /** Format money in the active display currency; falls back to source currency if conversion fails. */
  formatMoney: (amount: number, fromCurrency?: string) => string;
}

const DEFAULT_FROM = 'USD';

export function useDisplayMoney(): UseDisplayMoneyResult {
  const displayCurrency = useDisplayCurrencyStore((s) => s.currency);
  const setDisplayCurrency = useDisplayCurrencyStore((s) => s.setCurrency);
  const rates = useDisplayCurrencyStore((s) => s.rates);
  const ratesReady = useDisplayCurrencyStore((s) => s.ratesReady);
  const ensureRates = useDisplayCurrencyStore((s) => s.ensureRates);
  useEffect(() => {
    void ensureRates();
  }, [ensureRates]);
  function convert(amount: number, fromCurrency: string): number | null {
    const converted = convertCurrencyAmount(amount, fromCurrency, displayCurrency, rates);
    if (converted === null) return null;
    return Math.round(converted);
  }
  function formatMoney(amount: number, fromCurrency: string = DEFAULT_FROM): string {
    const converted = convert(amount, fromCurrency);
    if (converted === null) {
      return formatCurrencyAmount(Math.round(amount), fromCurrency);
    }
    return formatCurrencyAmount(converted, displayCurrency);
  }
  return {
    displayCurrency,
    setDisplayCurrency,
    rates,
    ratesReady,
    convert,
    formatMoney,
  };
}
