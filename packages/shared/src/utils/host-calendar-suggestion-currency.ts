import { SEARCH_DISPLAY_CURRENCIES } from '../dto/property-search';

/**
 * Rate suggestions may only mention the display currency and optionally the
 * settlement currency (for `~N USD` hints). Wrong codes like `120 AMD` when
 * display is USD are rejected.
 */
export function suggestionMatchesDisplayCurrency(
  suggestion: string,
  displayCurrency: string,
  settlementCurrency: string,
): boolean {
  const upper = suggestion.toUpperCase();
  const mentioned = SEARCH_DISPLAY_CURRENCIES.filter((code) =>
    new RegExp(`\\b${code}\\b`).test(upper),
  );
  if (mentioned.length === 0) return true;
  return mentioned.every((code) => code === displayCurrency || code === settlementCurrency);
}

export function suggestionsMatchDisplayCurrency(
  suggestions: string[],
  displayCurrency: string,
  settlementCurrency = 'USD',
): boolean {
  return suggestions.every((suggestion) =>
    suggestionMatchesDisplayCurrency(suggestion, displayCurrency, settlementCurrency),
  );
}
