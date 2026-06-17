import {
  addDaysIso,
  buildHostCalendarSnapshot,
  computeNextWeekend,
  type HostCalendarPropertySnapshot,
} from './host-calendar-snapshot';

const property: HostCalendarPropertySnapshot = {
  title: 'Cozy Yerevan Apartment',
  city: 'Yerevan',
  propertyType: 'APARTMENT',
  minNights: 1,
  basePricePerNight: 50000,
  currency: 'AMD',
};

describe('host-calendar-snapshot', () => {
  it('computes next weekend from a Wednesday', () => {
    const weekend = computeNextWeekend('2026-06-10');
    expect(weekend.from).toBe('2026-06-13');
    expect(weekend.to).toBe('2026-06-14');
  });

  it('counts override days in snapshot', () => {
    const snapshot = buildHostCalendarSnapshot(
      property,
      [
        {
          date: '2026-06-10',
          isAvailable: true,
          isBlockedByBooking: false,
          priceOverride: 60000,
          effectivePricePerNight: 60000,
        },
        {
          date: '2026-06-11',
          isAvailable: false,
          isBlockedByBooking: false,
          priceOverride: null,
          effectivePricePerNight: 50000,
        },
      ],
      '2026-06-10',
      90,
    );
    expect(snapshot.calendar.overrideDays).toBe(1);
    expect(snapshot.calendar.closedDays).toBe(1);
    expect(snapshot.calendar.rangeTo).toBe(addDaysIso('2026-06-10', 90));
  });
});
