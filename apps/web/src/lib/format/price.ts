const AMD_CURRENCY_LABEL = 'AMD';

/**
 * Formats an integer amount as a grouped number followed by " AMD".
 * Uses a fixed locale ('en-US') for digit grouping so the output is identical
 * on both the Node.js server and the browser, preventing hydration mismatches.
 * The trailing currency label is appended manually because the ֏ symbol renders
 * unreliably across system fonts.
 */
export function formatAmd(amount: number): string {
  const value = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${value} ${AMD_CURRENCY_LABEL}`;
}
