import type { AvailabilityDayView } from '@repo/shared';

export interface HostCalendarPropertySnapshot {
  title: string;
  city: string;
  propertyType: string;
  minNights: number;
  basePricePerNight: number;
  currency: string;
}

export interface HostCalendarCalendarSnapshot {
  todayIso: string;
  rangeFrom: string;
  rangeTo: string;
  openDays: number;
  closedDays: number;
  bookedDays: number;
  overrideDays: number;
  nextWeekendFrom: string;
  nextWeekendTo: string;
  isSummerSeason: boolean;
  summerFrom: string;
  summerTo: string;
  holidayFrom: string;
  holidayTo: string;
}

export interface HostCalendarSnapshot {
  property: HostCalendarPropertySnapshot;
  calendar: HostCalendarCalendarSnapshot;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function computeNextWeekend(fromIso: string): { from: string; to: string } {
  const date = new Date(`${fromIso}T12:00:00`);
  const day = date.getDay();
  const daysUntilSaturday = day === 6 ? 7 : day === 0 ? 6 : 6 - day;
  const saturday = addDaysIso(fromIso, daysUntilSaturday);
  const sunday = addDaysIso(saturday, 1);
  return { from: saturday, to: sunday };
}

export function computeSummerRange(year: number): { from: string; to: string } {
  return { from: `${year}-06-01`, to: `${year}-08-31` };
}

export function computeHolidayRange(year: number): { from: string; to: string } {
  return { from: `${year}-12-24`, to: `${year + 1}-01-02` };
}

export function isSummerActive(todayIso: string): boolean {
  const month = Number.parseInt(todayIso.slice(5, 7), 10);
  return month >= 6 && month <= 8;
}

export function buildHostCalendarSnapshot(
  property: HostCalendarPropertySnapshot,
  entries: AvailabilityDayView[],
  todayIso: string,
  rangeDays: number,
): HostCalendarSnapshot {
  const rangeFrom = todayIso;
  const rangeTo = addDaysIso(todayIso, rangeDays);
  let openDays = 0;
  let closedDays = 0;
  let bookedDays = 0;
  let overrideDays = 0;
  for (const entry of entries) {
    if (entry.isBlockedByBooking) {
      bookedDays += 1;
      continue;
    }
    if (!entry.isAvailable) closedDays += 1;
    else openDays += 1;
    if (entry.priceOverride !== null) overrideDays += 1;
  }
  const year = Number.parseInt(todayIso.slice(0, 4), 10);
  const summer = computeSummerRange(year);
  const holiday = computeHolidayRange(year);
  const nextWeekend = computeNextWeekend(todayIso);
  return {
    property,
    calendar: {
      todayIso,
      rangeFrom,
      rangeTo,
      openDays,
      closedDays,
      bookedDays,
      overrideDays,
      nextWeekendFrom: nextWeekend.from,
      nextWeekendTo: nextWeekend.to,
      isSummerSeason: isSummerActive(todayIso),
      summerFrom: summer.from,
      summerTo: summer.to,
      holidayFrom: holiday.from,
      holidayTo: holiday.to,
    },
  };
}

export function formatSnapshotForLlm(snapshot: HostCalendarSnapshot): string {
  const { property, calendar } = snapshot;
  return [
    `Property: ${property.title} (${property.propertyType}) in ${property.city}`,
    `Base rate: ${property.basePricePerNight} ${property.currency}/night, min nights: ${property.minNights}`,
    `Calendar window ${calendar.rangeFrom} to ${calendar.rangeTo}: open=${calendar.openDays}, closed=${calendar.closedDays}, booked=${calendar.bookedDays}, custom rates=${calendar.overrideDays}`,
    `Next weekend: ${calendar.nextWeekendFrom} to ${calendar.nextWeekendTo}`,
    `Summer: ${calendar.summerFrom} to ${calendar.summerTo} (active=${calendar.isSummerSeason})`,
    `Holiday block: ${calendar.holidayFrom} to ${calendar.holidayTo}`,
  ].join('\n');
}
