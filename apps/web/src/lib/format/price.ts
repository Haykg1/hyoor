/**
 * Formats an integer amount as a grouped number followed by the currency code (e.g. "250 USD").
 * Uses a fixed locale ('en-US') for digit grouping so the output is identical on both the
 * Node.js server and the browser, preventing hydration mismatches. The currency label is
 * appended manually rather than via `Intl.NumberFormat`'s `currency` style because symbols
 * (e.g. ֏ for AMD) render unreliably across system fonts.
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const value = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${value} ${currency}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
};

/** Compact amount with a currency symbol (e.g. "$100", "֏36,669", "€90"). */
export function formatCurrencySymbolAmount(amount: number, currency: string): string {
  const value = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  const symbol = CURRENCY_SYMBOLS[currency];
  if (symbol) return `${symbol}${value}`;
  return `${value} ${currency}`;
}

/** Formats Stripe minor units (cents) as major USD, e.g. 2000 → "20.00 USD". */
export function formatUsdFromMinor(amount: number): string {
  const major = amount / 100;
  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${value} USD`;
}
