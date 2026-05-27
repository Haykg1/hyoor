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
  priceOverride: number | null;
  effectivePricePerNight: number;
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
    const rows = await this.prisma.availability.findMany({
      where: {
        propertyId,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: { date: 'asc' },
    });
    return {
      propertyId,
      basePricePerNight: property.pricePerNight,
      currency: property.currency,
      from: formatIsoDate(fromDate),
      to: formatIsoDate(toDate),
      entries: rows.map((row) => this.toDayView(row, property.pricePerNight)),
    };
  }

  async bulkUpsert(
    propertyId: string,
    hostUserId: string,
    entries: AvailabilityEntryDto[],
  ): Promise<AvailabilityDayView[]> {
    const property = await this.assertHostOwnsProperty(propertyId, hostUserId);
    const upserted: Availability[] = [];
    for (const entry of entries) {
      const date = parseIsoDate(entry.date, 'date');
      const row = await this.prisma.availability.upsert({
        where: {
          propertyId_date: { propertyId, date },
        },
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
      .map((row) => this.toDayView(row, property.pricePerNight));
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
    for (const booking of bookings) {
      for (const date of eachNightBetween(booking.checkIn, booking.checkOut)) {
        if (date >= fromDate && date <= toDate) {
          blocked.add(formatIsoDate(date));
        }
      }
    }
    return [...blocked].sort();
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

  private toDayView(row: Availability, basePricePerNight: number): AvailabilityDayView {
    return {
      date: formatIsoDate(row.date),
      isAvailable: row.isAvailable,
      priceOverride: row.priceOverride,
      effectivePricePerNight: row.priceOverride ?? basePricePerNight,
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
