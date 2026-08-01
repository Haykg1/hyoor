'use client';

import type { CurrencyRatesPayload, SearchDisplayCurrency } from '@repo/shared';
import { useEffect } from 'react';

import { convertCurrencyAmount } from '@/lib/currency/convert';
import { formatMajorMoney, formatStoredMoney, minorToMajor, roundMajor } from '@/lib/format/money';
import { useDisplayCurrencyStore } from '@/store/display-currency.store';

interface UseDisplayMoneyResult {
  displayCurrency: SearchDisplayCurrency;
  setDisplayCurrency: (currency: SearchDisplayCurrency) => void;
  rates: CurrencyRatesPayload | null;
  ratesReady: boolean;
  /** Convert a stored minor-unit amount into major units of the active display currency (null if FX unavailable). */
  convert: (minorAmount: number, fromCurrency: string) => number | null;
  /** Format a stored minor-unit amount in the active display currency; falls back to source currency if conversion fails. */
  formatMoney: (minorAmount: number, fromCurrency?: string) => string;
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
  function convert(minorAmount: number, fromCurrency: string): number | null {
    const converted = convertCurrencyAmount(
      minorToMajor(minorAmount, fromCurrency),
      fromCurrency,
      displayCurrency,
      rates,
    );
    if (converted === null) return null;
    return roundMajor(converted, displayCurrency);
  }
  function formatMoney(minorAmount: number, fromCurrency: string = DEFAULT_FROM): string {
    const converted = convert(minorAmount, fromCurrency);
    if (converted === null) {
      return formatStoredMoney(minorAmount, fromCurrency);
    }
    return formatMajorMoney(converted, displayCurrency);
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
