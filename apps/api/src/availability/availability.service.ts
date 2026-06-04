import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Availability, Property } from '@repo/database/client';

import { PrismaService } from '../database/prisma.service';
import { HostProfilesService } from '../host-profiles/host-profiles.service';

import { AvailabilityEntryDto } from './dto/availability-entry.dto';

const BLOCKING_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;
const MAX_OPEN_RANGE_DAYS = 366;

export interface AvailabilityRangeResponse {
  propertyId: string;
  basePricePerNight: number;
  currency: string;
  from: string;
  to: string;
  entries: AvailabilityDayView[];
}

export interface AvailabilityDayView {
  date: string;
  isAvailable: boolean;
  isBlockedByBooking: boolean;
  priceOverride: number | null;
  effectivePricePerNight: number;
}

export interface OpenRangeResult {
  propertyId: string;
  from: string;
  to: string;
  openedCount: number;
  skippedBookedCount: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hostProfilesService: HostProfilesService,
  ) {}

  async getForRange(
    propertyId: string,
    from: string,
    to: string,
  ): Promise<AvailabilityRangeResponse> {
    const property = await this.getPropertyOrThrow(propertyId);
    const fromDate = parseIsoDate(from, 'from');
    const toDate = parseIsoDate(to, 'to');
    validateDateRange(fromDate, toDate);
    const [rows, bookedDates] = await Promise.all([
      this.prisma.availability.findMany({
        where: { propertyId, date: { gte: fromDate, lte: toDate } },
      }),
      this.collectBookingBlockedDates(propertyId, fromDate, toDate),
    ]);
    const rowByDate = new Map<string, Availability>();
    for (const row of rows) rowByDate.set(formatIsoDate(row.date), row);
    const entries: AvailabilityDayView[] = [];
    for (const date of eachDayInclusive(fromDate, toDate)) {
      const iso = formatIsoDate(date);
      const row = rowByDate.get(iso) ?? null;
      const isBlockedByBooking = bookedDates.has(iso);
      entries.push(this.toDayView(iso, row, property.pricePerNight, isBlockedByBooking));
    }
    return {
      propertyId,
      basePricePerNight: property.pricePerNight,
      currency: property.currency,
      from: formatIsoDate(fromDate),
      to: formatIsoDate(toDate),
      entries,
    };
  }

  async bulkUpsert(
    propertyId: string,
    actingUserId: string,
    actingUserRole: string,
    entries: AvailabilityEntryDto[],
  ): Promise<AvailabilityDayView[]> {
    const property = await this.assertCanManageProperty(propertyId, actingUserId, actingUserRole);
    const upserted: Availability[] = [];
    const bookedBlocked: Set<string> = await this.collectBookingBlockedDates(
      propertyId,
      parseIsoDate(entries[0]!.date, 'date'),
      parseIsoDate(entries[entries.length - 1]!.date, 'date'),
    );
    for (const entry of entries) {
      const date = parseIsoDate(entry.date, 'date');
      const row = await this.prisma.availability.upsert({
        where: { propertyId_date: { propertyId, date } },
        create: {
          propertyId,
          date,
          isAvailable: entry.isAvailable,
          priceOverride: entry.priceOverride ?? null,
        },
        update: {
          isAvailable: entry.isAvailable,
          priceOverride: entry.priceOverride ?? null,
        },
      });
      upserted.push(row);
    }
    return upserted
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((row) =>
        this.toDayView(
          formatIsoDate(row.date),
          row,
          property.pricePerNight,
          bookedBlocked.has(formatIsoDate(row.date)),
        ),
      );
  }

  /**
   * Marks every day in [from, to] (inclusive) as available, except dates already
   * blocked by an active booking (those stay unavailable). Defaults to the next
   * 365 days starting from today when `from` and `to` are omitted.
   */
  async openRange(
    propertyId: string,
    actingUserId: string,
    actingUserRole: string,
    from?: string,
    to?: string,
  ): Promise<OpenRangeResult> {
    await this.assertCanManageProperty(propertyId, actingUserId, actingUserRole);
    const today = todayUtc();
    const fromDate = from ? parseIsoDate(from, 'from') : today;
    const toDate = to ? parseIsoDate(to, 'to') : addDays(today, 364);
    validateDateRange(fromDate, toDate);
    const totalDays = diffDaysInclusive(fromDate, toDate);
    if (totalDays > MAX_OPEN_RANGE_DAYS) {
      throw new BadRequestException(
        `openRange supports at most ${MAX_OPEN_RANGE_DAYS} days at a time`,
      );
    }
    const bookedBlocked = await this.collectBookingBlockedDates(propertyId, fromDate, toDate);
    let opened = 0;
    for (const date of eachDayInclusive(fromDate, toDate)) {
      const iso = formatIsoDate(date);
      if (bookedBlocked.has(iso)) continue;
      await this.prisma.availability.upsert({
        where: { propertyId_date: { propertyId, date } },
        create: { propertyId, date, isAvailable: true },
        update: { isAvailable: true },
      });
      opened += 1;
    }
    return {
      propertyId,
      from: formatIsoDate(fromDate),
      to: formatIsoDate(toDate),
      openedCount: opened,
      skippedBookedCount: bookedBlocked.size,
    };
  }

  async getBlockedDates(
    propertyId: string,
    from: string,
    to: string,
    excludeBookingId?: string,
  ): Promise<string[]> {
    await this.getPropertyOrThrow(propertyId);
    const fromDate = parseIsoDate(from, 'from');
    const toDate = parseIsoDate(to, 'to');
    validateDateRange(fromDate, toDate);
    const blocked = new Set<string>();
    const unavailableRows = await this.prisma.availability.findMany({
      where: {
        propertyId,
        isAvailable: false,
        date: { gte: fromDate, lte: toDate },
      },
      select: { date: true },
    });
    for (const row of unavailableRows) {
      blocked.add(formatIsoDate(row.date));
    }
    const bookedDates = await this.collectBookingBlockedDates(
      propertyId,
      fromDate,
      toDate,
      excludeBookingId,
    );
    for (const iso of bookedDates) blocked.add(iso);
    return [...blocked].sort();
  }

  /**
   * Returns the set of ISO dates inside [fromDate, toDate] (inclusive) that are
   * occupied by an active booking (PENDING/CONFIRMED). These dates cannot be
   * opened back up by the host until the booking is cancelled/completed.
   */
  private async collectBookingBlockedDates(
    propertyId: string,
    fromDate: Date,
    toDate: Date,
    excludeBookingId?: string,
  ): Promise<Set<string>> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
        checkIn: { lte: toDate },
        checkOut: { gt: fromDate },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { checkIn: true, checkOut: true },
    });
    const blocked = new Set<string>();
    for (const booking of bookings) {
      for (const date of eachNightBetween(booking.checkIn, booking.checkOut)) {
        if (date >= fromDate && date <= toDate) {
          blocked.add(formatIsoDate(date));
        }
      }
    }
    return blocked;
  }

  async blockDatesForBooking(propertyId: string, checkIn: Date, checkOut: Date): Promise<void> {
    for (const date of eachNightBetween(checkIn, checkOut)) {
      await this.prisma.availability.upsert({
        where: { propertyId_date: { propertyId, date } },
        create: { propertyId, date, isAvailable: false },
        update: { isAvailable: false },
      });
    }
  }

  async unblockDatesForBooking(propertyId: string, checkIn: Date, checkOut: Date): Promise<void> {
    for (const date of eachNightBetween(checkIn, checkOut)) {
      await this.prisma.availability.upsert({
        where: { propertyId_date: { propertyId, date } },
        create: { propertyId, date, isAvailable: true, priceOverride: null },
        update: { isAvailable: true },
      });
    }
  }

  async isRangeAvailable(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    await this.getPropertyOrThrow(propertyId);
    if (checkOut <= checkIn) {
      return false;
    }
    const blocked = await this.getBlockedDates(
      propertyId,
      formatIsoDate(checkIn),
      formatIsoDate(addDays(checkOut, -1)),
      excludeBookingId,
    );
    for (const date of eachNightBetween(checkIn, checkOut)) {
      if (blocked.includes(formatIsoDate(date))) {
        return false;
      }
    }
    return true;
  }

  private async getPropertyOrThrow(propertyId: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  private async assertHostOwnsProperty(propertyId: string, hostUserId: string): Promise<Property> {
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    const property = await this.getPropertyOrThrow(propertyId);
    if (property.hostId !== hostProfile.id) {
      throw new ForbiddenException('You do not own this property');
    }
    return property;
  }

  /**
   * Property managers = owning HOST, or any ADMIN/STAFF user. Used by mutation
   * endpoints that should be available to platform operators in addition to
   * the property's own host.
   */
  private async assertCanManageProperty(
    propertyId: string,
    actingUserId: string,
    actingUserRole: string,
  ): Promise<Property> {
    if (actingUserRole === 'ADMIN' || actingUserRole === 'STAFF') {
      return this.getPropertyOrThrow(propertyId);
    }
    return this.assertHostOwnsProperty(propertyId, actingUserId);
  }

  private toDayView(
    iso: string,
    row: Availability | null,
    basePricePerNight: number,
    isBlockedByBooking: boolean,
  ): AvailabilityDayView {
    const baseAvailability = row?.isAvailable ?? true;
    return {
      date: iso,
      isAvailable: baseAvailability && !isBlockedByBooking,
      isBlockedByBooking,
      priceOverride: row?.priceOverride ?? null,
      effectivePricePerNight: row?.priceOverride ?? basePricePerNight,
    };
  }
}

function parseIsoDate(value: string, field: string): Date {
  const date = utcDateFromString(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${field} date`);
  }
  return date;
}

function validateDateRange(from: Date, to: Date): void {
  if (to < from) {
    throw new BadRequestException('to must be on or after from');
  }
}

function utcDateFromString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function eachNightBetween(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  let current = utcDateFromString(formatIsoDate(checkIn));
  const end = utcDateFromString(formatIsoDate(checkOut));
  while (current < end) {
    nights.push(new Date(current.getTime()));
    current = addDays(current, 1);
  }
  return nights;
}

function eachDayInclusive(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let cursor = utcDateFromString(formatIsoDate(from));
  const end = utcDateFromString(formatIsoDate(to));
  while (cursor <= end) {
    out.push(new Date(cursor.getTime()));
    cursor = addDays(cursor, 1);
  }
  return out;
}

function diffDaysInclusive(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay) + 1;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
