import {
  buildBlockedDatesForProperty,
  findFirstFlexibleStaySlot,
  formatIsoDate,
  utcDateFromString,
} from './flexible-availability';

describe('findFirstFlexibleStaySlot', () => {
  it('returns the first gap that fits stayNights', () => {
    const blocked = new Set(['2026-07-01', '2026-07-02', '2026-07-03']);
    const match = findFirstFlexibleStaySlot(blocked, '2026-07-01', '2026-07-31', 5);
    expect(match).toEqual({
      suggestedCheckIn: '2026-07-04',
      suggestedCheckOut: '2026-07-09',
    });
  });

  it('returns null when no window fits', () => {
    const blocked = new Set([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
      '2026-07-06',
      '2026-07-07',
    ]);
    const match = findFirstFlexibleStaySlot(blocked, '2026-07-01', '2026-07-07', 5);
    expect(match).toBeNull();
  });
});

describe('buildBlockedDatesForProperty', () => {
  it('merges booking nights and closed availability rows', () => {
    const rangeFrom = utcDateFromString('2026-07-01');
    const rangeTo = utcDateFromString('2026-07-10');
    const blocked = buildBlockedDatesForProperty(
      [{ checkIn: utcDateFromString('2026-07-03'), checkOut: utcDateFromString('2026-07-05') }],
      [{ date: utcDateFromString('2026-07-08') }],
      rangeFrom,
      rangeTo,
    );
    expect(blocked.has('2026-07-03')).toBe(true);
    expect(blocked.has('2026-07-04')).toBe(true);
    expect(blocked.has('2026-07-05')).toBe(false);
    expect(blocked.has(formatIsoDate(utcDateFromString('2026-07-08')))).toBe(true);
  });
});
