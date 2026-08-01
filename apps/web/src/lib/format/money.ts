import currency from 'currency.js';

/**
 * Single home for currency.js usage. App money amounts are stored as integers in
 * minor currency units (e.g. 10000 = 100.00 USD); whole-unit currencies like AMD
 * use precision 0 so stored and typed values are identical.
 */
const ZERO_PRECISION_CURRENCIES = new Set(['AMD', 'JPY', 'KRW', 'VND']);

interface MoneyOptions {
  precision: number;
  symbol: string;
  separator: string;
  decimal: string;
}

export function getCurrencyOptions(currencyCode: string): MoneyOptions {
  const precision = ZERO_PRECISION_CURRENCIES.has(currencyCode.toUpperCase()) ? 0 : 2;
  return { precision, symbol: '', separator: ',', decimal: '.' };
}

/** Stored minor units → major units for editing/display (10000 → 100 for USD). */
export function minorToMajor(minor: number, currencyCode: string): number {
  return currency(minor, { ...getCurrencyOptions(currencyCode), fromCents: true }).value;
}

/** Major units → stored integer minor units (100 → 10000 for USD). */
export function majorToMinor(major: number, currencyCode: string): number {
  return currency(major, getCurrencyOptions(currencyCode)).intValue;
}

/** Blur display for money inputs: "100.00" for USD, "28000" for AMD. No symbol, no grouping. */
export function formatMoneyInputDisplay(major: number, currencyCode: string): string {
  return currency(major, { ...getCurrencyOptions(currencyCode), separator: '' }).format();
}

/** Parse free-form user text into a major-unit amount; null when not a valid non-negative number. */
export function parseMoneyInput(text: string, currencyCode: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || !/^[\d,]*\.?\d*$/.test(trimmed)) return null;
  const parsed = currency(trimmed, getCurrencyOptions(currencyCode));
  if (!Number.isFinite(parsed.value) || parsed.value < 0) return null;
  return parsed.value;
}

/** Restrict characters while typing (digits, one dot for decimal currencies). */
export function sanitizeMoneyInputTyping(text: string, currencyCode: string): string {
  const { precision } = getCurrencyOptions(currencyCode);
  let cleaned = text.replace(precision === 0 ? /[^\d]/g : /[^\d.]/g, '');
  if (precision > 0) {
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned =
        cleaned.slice(0, firstDot + 1) +
        cleaned
          .slice(firstDot + 1)
          .replace(/\./g, '')
          .slice(0, precision);
    }
  }
  return cleaned;
}

/** Round a major-unit amount to the currency's precision (e.g. FX results). */
export function roundMajor(major: number, currencyCode: string): number {
  return currency(major, getCurrencyOptions(currencyCode)).value;
}

/** Format a major-unit amount for display, e.g. 1250.5 → "1,250.50 USD". */
export function formatMajorMoney(major: number, currencyCode: string): string {
  const value = currency(major, getCurrencyOptions(currencyCode)).format();
  return `${value} ${currencyCode}`;
}

/** Format a stored minor-unit amount for display, e.g. 10000 → "100.00 USD". */
export function formatStoredMoney(minor: number, currencyCode: string): string {
  return formatMajorMoney(minorToMajor(minor, currencyCode), currencyCode);
}
