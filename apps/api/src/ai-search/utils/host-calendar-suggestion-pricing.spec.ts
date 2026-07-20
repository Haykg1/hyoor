import { suggestionMatchesDisplayCurrency } from '@repo/shared';

import {
  buildSuggestionPricingFromUsd,
  formatSuggestionRate,
  normalizeDisplayCurrency,
} from './host-calendar-suggestion-pricing';

describe('host-calendar-suggestion-pricing', () => {
  it('normalizes display currency and defaults to USD', () => {
    expect(normalizeDisplayCurrency('AMD')).toBe('AMD');
    expect(normalizeDisplayCurrency('EUR')).toBe('EUR');
    expect(normalizeDisplayCurrency('USD')).toBe('USD');
    expect(normalizeDisplayCurrency('GBP')).toBe('USD');
    expect(normalizeDisplayCurrency(undefined)).toBe('USD');
  });

  it('keeps USD amounts when display is USD', () => {
    const pricing = buildSuggestionPricingFromUsd(100, 'USD', (n) => n * 400);
    expect(pricing.displayCurrency).toBe('USD');
    expect(pricing.peakDisplay).toBe(120);
    expect(pricing.weekendDisplay).toBe(110);
    expect(pricing.peakUsd).toBe(120);
  });

  it('converts to display currency and keeps USD settlement amounts', () => {
    const pricing = buildSuggestionPricingFromUsd(100, 'AMD', (n) => n * 400);
    expect(pricing.displayCurrency).toBe('AMD');
    expect(pricing.peakDisplay).toBe(48000);
    expect(pricing.weekendDisplay).toBe(44000);
    expect(pricing.peakUsd).toBe(120);
    expect(pricing.weekendUsd).toBe(110);
  });

  it('falls back to USD when conversion is unavailable', () => {
    const pricing = buildSuggestionPricingFromUsd(100, 'AMD', null);
    expect(pricing.displayCurrency).toBe('USD');
    expect(pricing.peakDisplay).toBe(120);
  });

  it('formats rate with optional settlement hint', () => {
    expect(formatSuggestionRate(120, 'USD', 120, 'USD')).toBe('120 USD');
    expect(formatSuggestionRate(48000, 'AMD', 120, 'USD')).toBe('48000 AMD (~120 USD)');
  });

  it('matches display currency mentions and allows settlement hints', () => {
    expect(suggestionMatchesDisplayCurrency('Close next week', 'USD', 'USD')).toBe(true);
    expect(suggestionMatchesDisplayCurrency('Set 120 USD for next weekend', 'USD', 'USD')).toBe(
      true,
    );
    expect(suggestionMatchesDisplayCurrency('Set 120 AMD for next weekend', 'USD', 'USD')).toBe(
      false,
    );
    expect(
      suggestionMatchesDisplayCurrency('Set 48000 AMD (~120 USD) for summer', 'AMD', 'USD'),
    ).toBe(true);
  });
});
