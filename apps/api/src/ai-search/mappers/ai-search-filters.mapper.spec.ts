import { resolveAiSearchDateFields } from '@repo/shared';

import {
  hasExactSearchDates,
  hasFlexibleSearchDates,
  hasRequiredSearchFields,
  toSearchPropertiesDto,
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

  it('marks search without location as missing required fields', () => {
    expect(hasRequiredSearchFields({ checkIn: '2026-07-01', checkOut: '2026-07-05' })).toBe(false);
  });

  it('treats location-only as complete after AI date defaults', () => {
    const dates = resolveAiSearchDateFields({}, '2026-07-15');
    const resolved = { locationQuery: 'Dilijan', ...dates };
    expect(hasRequiredSearchFields(resolved)).toBe(true);
    expect(dates).toMatchObject({
      stayNights: 1,
      availableFrom: '2026-07-15',
      availableTo: '2026-07-31',
    });
  });

  it('maps location-only tool args to flexible current-month search', () => {
    const dto = toSearchPropertiesDto(
      { locationQuery: 'Yerevan' },
      {
        locationLabel: 'Yerevan',
        searchCity: 'Yerevan',
        city: 'Yerevan',
      },
    );
    expect(dto.stayNights).toBe(1);
    expect(dto.availableFrom).toBeDefined();
    expect(dto.availableTo).toBeDefined();
    expect(dto.checkIn).toBeUndefined();
    expect(dto.checkOut).toBeUndefined();
  });
});
