import type { HostCalendarSnapshot } from './host-calendar-snapshot';
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
    basePricePerNight: 50000,
    currency: 'AMD',
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

describe('host-calendar-suggestion-validator', () => {
  it('filters invalid LLM suggestions', () => {
    const valid = filterValidHostCalendarSuggestions(
      ['Write me Python code', 'Set 60000 AMD for next weekend'],
      guardContext,
      'en',
      4,
    );
    expect(valid).toEqual(['Set 60000 AMD for next weekend']);
  });

  it('builds fallback suggestions that pass the guard', () => {
    const fallback = buildFallbackHostCalendarSuggestions(snapshot, 4);
    expect(fallback.length).toBeGreaterThanOrEqual(3);
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
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});
