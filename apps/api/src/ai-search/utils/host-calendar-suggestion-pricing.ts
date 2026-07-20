import { SEARCH_DISPLAY_CURRENCIES, type SearchDisplayCurrency } from '@repo/shared';

export interface HostCalendarSuggestionPricing {
  displayCurrency: SearchDisplayCurrency;
  settlementCurrency: string;
  baseDisplay: number;
  peakDisplay: number;
  weekendDisplay: number;
  peakUsd: number;
  weekendUsd: number;
}

export function normalizeDisplayCurrency(raw?: string): SearchDisplayCurrency {
  if (raw && (SEARCH_DISPLAY_CURRENCIES as readonly string[]).includes(raw)) {
    return raw as SearchDisplayCurrency;
  }
  return 'USD';
}

export function buildSuggestionPricingFromUsd(
  baseUsd: number,
  displayCurrency: SearchDisplayCurrency,
  convertUsdToDisplay: ((amountUsd: number) => number | null) | null,
): HostCalendarSuggestionPricing {
  const settlementCurrency = 'USD';
  const peakUsd = Math.round(baseUsd * 1.2);
  const weekendUsd = Math.round(baseUsd * 1.1);
  if (displayCurrency === settlementCurrency || !convertUsdToDisplay) {
    return {
      displayCurrency: settlementCurrency,
      settlementCurrency,
      baseDisplay: Math.round(baseUsd),
      peakDisplay: peakUsd,
      weekendDisplay: weekendUsd,
      peakUsd,
      weekendUsd,
    };
  }
  const convertOrFallback = (amountUsd: number): number | null => {
    const converted = convertUsdToDisplay(amountUsd);
    return converted === null ? null : Math.round(converted);
  };
  const baseDisplay = convertOrFallback(baseUsd);
  const peakDisplay = convertOrFallback(peakUsd);
  const weekendDisplay = convertOrFallback(weekendUsd);
  if (baseDisplay === null || peakDisplay === null || weekendDisplay === null) {
    return {
      displayCurrency: settlementCurrency,
      settlementCurrency,
      baseDisplay: Math.round(baseUsd),
      peakDisplay: peakUsd,
      weekendDisplay: weekendUsd,
      peakUsd,
      weekendUsd,
    };
  }
  return {
    displayCurrency,
    settlementCurrency,
    baseDisplay,
    peakDisplay,
    weekendDisplay,
    peakUsd,
    weekendUsd,
  };
}

/** Format a nightly rate for suggestion chips; appends (~N USD) when display ≠ settlement. */
export function formatSuggestionRate(
  displayAmount: number,
  displayCurrency: string,
  usdAmount: number,
  settlementCurrency: string,
): string {
  if (displayCurrency === settlementCurrency) {
    return `${displayAmount} ${displayCurrency}`;
  }
  return `${displayAmount} ${displayCurrency} (~${usdAmount} ${settlementCurrency})`;
}
