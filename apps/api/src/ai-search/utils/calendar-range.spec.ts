import {
  diffProposedVsCurrent,
  expandDateRangeToEntries,
  entryMatchesCurrent,
} from './calendar-range';

describe('calendar-range', () => {
  it('expands inclusive date range', () => {
    const entries = expandDateRangeToEntries('2026-06-10', '2026-06-12', false, undefined);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.date)).toEqual(['2026-06-10', '2026-06-11', '2026-06-12']);
    expect(entries.every((e) => e.isAvailable === false)).toBe(true);
  });

  it('detects when entry already matches current state', () => {
    const current = {
      date: '2026-06-10',
      isAvailable: false,
      isBlockedByBooking: false,
      priceOverride: null,
    };
    expect(entryMatchesCurrent({ date: '2026-06-10', isAvailable: false }, current, 25000)).toBe(
      true,
    );
  });

  it('returns only differing days in diff', () => {
    const proposed = expandDateRangeToEntries('2026-06-10', '2026-06-11', false, undefined);
    const currentByDate = new Map([
      [
        '2026-06-10',
        {
          date: '2026-06-10',
          isAvailable: false,
          isBlockedByBooking: false,
          priceOverride: null,
        },
      ],
    ]);
    const delta = diffProposedVsCurrent(proposed, currentByDate, 25000);
    expect(delta).toHaveLength(1);
    expect(delta[0]?.date).toBe('2026-06-11');
  });
});
