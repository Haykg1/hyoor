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

export function formatAmd(amount: number): string {
  return formatCurrencyAmount(amount, 'AMD');
}
