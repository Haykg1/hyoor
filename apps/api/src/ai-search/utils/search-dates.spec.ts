import {
  applyAiSearchDateDefaults,
  resolveAiSearchDateFields,
  sanitizeExactStayDates,
  sanitizeFlexibleStayWindow,
  sanitizeSearchDateFields,
} from '@repo/shared';

describe('search date sanitization', () => {
  const today = '2026-07-15';

  it('shifts past exact stays forward preserving nights', () => {
    expect(sanitizeExactStayDates('2026-07-09', '2026-07-11', today)).toEqual({
      checkIn: '2026-07-15',
      checkOut: '2026-07-17',
    });
  });

  it('keeps future exact stays unchanged', () => {
    expect(sanitizeExactStayDates('2026-07-20', '2026-07-22', today)).toEqual({
      checkIn: '2026-07-20',
      checkOut: '2026-07-22',
    });
  });

  it('clamps flexible windows that start in the past', () => {
    expect(sanitizeFlexibleStayWindow('2026-07-01', '2026-07-31', today)).toEqual({
      availableFrom: '2026-07-15',
      availableTo: '2026-07-31',
    });
  });

  it('clears flexible windows that ended before today', () => {
    expect(sanitizeFlexibleStayWindow('2026-07-01', '2026-07-10', today)).toEqual({});
  });

  it('prefers sanitized exact dates over flexible fields', () => {
    expect(
      sanitizeSearchDateFields(
        {
          checkIn: '2026-07-09',
          checkOut: '2026-07-11',
          stayNights: 2,
          availableFrom: '2026-07-01',
          availableTo: '2026-07-31',
        },
        today,
      ),
    ).toEqual({
      checkIn: '2026-07-15',
      checkOut: '2026-07-17',
      stayNights: 2,
      availableFrom: undefined,
      availableTo: undefined,
    });
  });

  it('defaults missing timing to current month and 1 night', () => {
    expect(applyAiSearchDateDefaults({}, today)).toEqual({
      checkIn: undefined,
      checkOut: undefined,
      stayNights: 1,
      availableFrom: '2026-07-15',
      availableTo: '2026-07-31',
    });
  });

  it('defaults missing nights when a window is present', () => {
    expect(
      applyAiSearchDateDefaults({ availableFrom: '2026-08-01', availableTo: '2026-08-31' }, today),
    ).toEqual({
      checkIn: undefined,
      checkOut: undefined,
      stayNights: 1,
      availableFrom: '2026-08-01',
      availableTo: '2026-08-31',
    });
  });

  it('defaults missing window when nights are present', () => {
    expect(applyAiSearchDateDefaults({ stayNights: 3 }, today)).toEqual({
      checkIn: undefined,
      checkOut: undefined,
      stayNights: 3,
      availableFrom: '2026-07-15',
      availableTo: '2026-07-31',
    });
  });

  it('resolveAiSearchDateFields fills defaults then sanitizes', () => {
    expect(resolveAiSearchDateFields({}, today)).toMatchObject({
      stayNights: 1,
      availableFrom: '2026-07-15',
      availableTo: '2026-07-31',
    });
  });
});
