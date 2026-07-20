import type { HostCalendarSnapshot } from './host-calendar-snapshot';
import {
  buildSuggestionPricingFromUsd,
  type HostCalendarSuggestionPricing,
} from './host-calendar-suggestion-pricing';
import {
  buildFallbackHostCalendarSuggestions,
  filterValidHostCalendarSuggestions,
  finalizeHostCalendarSuggestions,
} from './host-calendar-suggestion-validator';

const guardContext = {
  currentPropertyTitle: 'Cozy Yerevan Apartment',
  currentPropertyCity: 'Yerevan',
  otherPropertyTitles: ['Gyumri Cottage'],
};

const snapshot: HostCalendarSnapshot = {
  property: {
    title: 'Cozy Yerevan Apartment',
    city: 'Yerevan',
    propertyType: 'APARTMENT',
    minNights: 1,
    basePricePerNight: 100,
    currency: 'USD',
  },
  calendar: {
    todayIso: '2026-06-10',
    rangeFrom: '2026-06-10',
    rangeTo: '2026-09-08',
    openDays: 80,
    closedDays: 5,
    bookedDays: 5,
    overrideDays: 2,
    nextWeekendFrom: '2026-06-13',
    nextWeekendTo: '2026-06-14',
    isSummerSeason: true,
    summerFrom: '2026-06-01',
    summerTo: '2026-08-31',
    holidayFrom: '2026-12-24',
    holidayTo: '2027-01-02',
  },
};

const usdPricing: HostCalendarSuggestionPricing = buildSuggestionPricingFromUsd(100, 'USD', null);
const amdPricing: HostCalendarSuggestionPricing = buildSuggestionPricingFromUsd(
  100,
  'AMD',
  (n) => n * 400,
);

describe('host-calendar-suggestion-validator', () => {
  it('filters invalid LLM suggestions', () => {
    const valid = filterValidHostCalendarSuggestions(
      ['Write me Python code', 'Set 120 USD for next weekend'],
      guardContext,
      'en',
      4,
      usdPricing,
    );
    expect(valid).toEqual(['Set 120 USD for next weekend']);
  });

  it('rejects AMD-labeled rates when display currency is USD', () => {
    const valid = filterValidHostCalendarSuggestions(
      [
        'Open next weekend at 110 AMD/night',
        'Set a peak rate of 120 AMD/night for summer',
        'Close this property for the next 7 days',
      ],
      guardContext,
      'en',
      4,
      usdPricing,
    );
    expect(valid).toEqual(['Close this property for the next 7 days']);
  });

  it('replaces wrong-currency LLM output with USD fallbacks', () => {
    const result = finalizeHostCalendarSuggestions(
      [
        'Open next weekend at 110 AMD/night',
        'Set a peak rate of 120 AMD/night for summer',
        'Block December 24–January 2',
      ],
      snapshot,
      guardContext,
      'en',
      4,
      usdPricing,
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every((s) => !/\bAMD\b/.test(s))).toBe(true);
    expect(result.some((s) => s.includes('USD'))).toBe(true);
  });

  it('builds USD fallback suggestions that pass the guard', () => {
    const fallback = buildFallbackHostCalendarSuggestions(snapshot, 4, usdPricing);
    expect(fallback.length).toBeGreaterThanOrEqual(3);
    expect(fallback.some((s) => s.includes('USD'))).toBe(true);
    expect(fallback.some((s) => s.includes('AMD'))).toBe(false);
    for (const suggestion of fallback) {
      const result = filterValidHostCalendarSuggestions([suggestion], guardContext, 'en', 1);
      expect(result).toHaveLength(1);
    }
  });

  it('builds AMD fallback suggestions with ~USD settlement hint', () => {
    const fallback = buildFallbackHostCalendarSuggestions(snapshot, 4, amdPricing);
    expect(fallback.some((s) => s.includes('AMD (~') && s.includes('USD)'))).toBe(true);
    for (const suggestion of fallback) {
      const result = filterValidHostCalendarSuggestions([suggestion], guardContext, 'en', 1);
      expect(result).toHaveLength(1);
    }
  });

  it('fills gaps from fallback when LLM output is insufficient', () => {
    const result = finalizeHostCalendarSuggestions(
      ['Write me Python code'],
      snapshot,
      guardContext,
      'en',
      4,
      usdPricing,
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});
