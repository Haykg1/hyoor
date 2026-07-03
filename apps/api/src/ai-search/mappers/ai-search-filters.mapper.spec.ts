import {
  hasExactSearchDates,
  hasFlexibleSearchDates,
  hasRequiredSearchFields,
} from './ai-search-filters.mapper';

describe('ai-search-filters.mapper', () => {
  it('accepts exact check-in and check-out', () => {
    const args = {
      locationQuery: 'Dilijan',
      checkIn: '2026-07-10',
      checkOut: '2026-07-15',
    };
    expect(hasExactSearchDates(args)).toBe(true);
    expect(hasFlexibleSearchDates(args)).toBe(false);
    expect(hasRequiredSearchFields(args)).toBe(true);
  });

  it('accepts flexible stay length and window', () => {
    const args = {
      locationQuery: 'Dilijan',
      stayNights: 5,
      availableFrom: '2026-07-01',
      availableTo: '2026-07-27',
      maxPrice: 24000,
    };
    expect(hasFlexibleSearchDates(args)).toBe(true);
    expect(hasRequiredSearchFields(args)).toBe(true);
  });

  it('rejects search without location or dates', () => {
    expect(hasRequiredSearchFields({ locationQuery: 'Dilijan' })).toBe(false);
    expect(hasRequiredSearchFields({ checkIn: '2026-07-01', checkOut: '2026-07-05' })).toBe(false);
  });
});
