import {
  canGuestCancelStay,
  getGuestCancellationDeadlineAt,
  getGuestCancellationDaysLeft,
  getGuestCancellationWindowStatus,
  isWithinGuestCancellationWindow,
  normalizeCancellationDeadlineDays,
} from '@repo/shared';

describe('cancellation deadline', () => {
  it('normalizes nullish and out-of-range deadline days', () => {
    expect(normalizeCancellationDeadlineDays(undefined)).toBe(0);
    expect(normalizeCancellationDeadlineDays(null)).toBe(0);
    expect(normalizeCancellationDeadlineDays(-3)).toBe(0);
    expect(normalizeCancellationDeadlineDays(100.9)).toBe(100);
    expect(normalizeCancellationDeadlineDays(101)).toBe(100);
    expect(normalizeCancellationDeadlineDays(14.2)).toBe(14);
  });

  it('allows cancel any time before check-in when deadline is 0', () => {
    const checkIn = new Date('2026-08-10T00:00:00.000Z');
    expect(isWithinGuestCancellationWindow(checkIn, 0, new Date('2026-08-09T23:59:59.000Z'))).toBe(
      true,
    );
    expect(isWithinGuestCancellationWindow(checkIn, 0, new Date('2026-08-10T00:00:00.000Z'))).toBe(
      false,
    );
  });

  it('closes guest cancel N days before check-in', () => {
    const checkIn = new Date('2026-08-20T00:00:00.000Z');
    expect(isWithinGuestCancellationWindow(checkIn, 7, new Date('2026-08-12T23:59:59.000Z'))).toBe(
      true,
    );
    expect(isWithinGuestCancellationWindow(checkIn, 7, new Date('2026-08-13T00:00:00.000Z'))).toBe(
      false,
    );
  });

  it('blocks NON_REFUNDABLE even inside the deadline window', () => {
    expect(
      canGuestCancelStay({
        cancellationPolicy: 'NON_REFUNDABLE',
        checkIn: '2026-09-01',
        cancellationDeadlineDays: 0,
        now: new Date('2026-08-01'),
      }),
    ).toBe(false);
  });

  it('allows flexible policies inside the window', () => {
    expect(
      canGuestCancelStay({
        cancellationPolicy: 'FLEXIBLE',
        checkIn: '2026-09-01',
        cancellationDeadlineDays: 14,
        now: new Date('2026-08-01'),
      }),
    ).toBe(true);
  });

  it('treats check-in minus deadline on booking day as already closed', () => {
    // Today 26 Jul, check-in 30 Jul, deadline 4 days → closes at 26 Jul 00:00 UTC.
    const checkIn = '2026-07-30';
    const now = new Date('2026-07-26T12:00:00.000Z');
    expect(getGuestCancellationDeadlineAt(checkIn, 4)?.toISOString()).toBe(
      '2026-07-26T00:00:00.000Z',
    );
    expect(getGuestCancellationDaysLeft(checkIn, 4, now)).toBe(0);
    expect(
      canGuestCancelStay({
        cancellationPolicy: 'MODERATE',
        checkIn,
        cancellationDeadlineDays: 4,
        now,
      }),
    ).toBe(false);
    expect(
      getGuestCancellationWindowStatus({
        cancellationPolicy: 'MODERATE',
        checkIn,
        cancellationDeadlineDays: 4,
        now,
      }),
    ).toMatchObject({
      canCancel: false,
      deadlineIso: '2026-07-26',
      daysLeft: 0,
    });
  });

  it('keeps one day left when booking the day before the cancel deadline', () => {
    const checkIn = '2026-07-30';
    const now = new Date('2026-07-25T15:00:00.000Z');
    expect(
      getGuestCancellationWindowStatus({
        cancellationPolicy: 'FLEXIBLE',
        checkIn,
        cancellationDeadlineDays: 4,
        now,
      }),
    ).toMatchObject({
      canCancel: true,
      deadlineIso: '2026-07-26',
      daysLeft: 1,
    });
  });
});
