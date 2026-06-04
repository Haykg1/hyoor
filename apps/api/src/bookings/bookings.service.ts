import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Booking, BookingStatus, Prisma, Property } from '@repo/database/client';
import type { PaginatedResponse } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';

import { AvailabilityService } from '../availability/availability.service';
import { PrismaService } from '../database/prisma.service';
import { HostProfilesService } from '../host-profiles/host-profiles.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';

const CANCELLABLE_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED'];

export interface BookingGuestProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface BookingPropertySummary {
  id: string;
  title: string;
  titleLabels: import('@repo/shared').PropertyTitleLabels | null;
  slug: string;
  city: string;
  country: string;
  coverPhotoUrl: string | null;
}

export interface BookingDetail extends Booking {
  property: BookingPropertySummary;
  guest: BookingGuestProfile;
  conversationId: string | null;
}

const COVER_PHOTO_PRESIGN_EXPIRES = 3600;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly hostProfilesService: HostProfilesService,
    private readonly notificationsService: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  private async safeCoverPhotoUrl(key: string | undefined | null): Promise<string | null> {
    if (!key || !this.storage.isConfigured) return null;
    try {
      return await this.storage.getPresignedUrl(key, COVER_PHOTO_PRESIGN_EXPIRES);
    } catch {
      return null;
    }
  }

  async create(guestId: string, dto: CreateBookingDto): Promise<BookingDetail> {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      include: { host: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status !== 'ACTIVE') {
      throw new BadRequestException('Property is not available for booking');
    }
    if (property.host.userId === guestId) {
      throw new BadRequestException('You cannot book your own property');
    }
    const checkIn = parseIsoDate(dto.checkIn, 'checkIn');
    const checkOut = parseIsoDate(dto.checkOut, 'checkOut');
    validateStayDates(checkIn, checkOut);
    if (dto.guestCount > property.maxGuests) {
      throw new BadRequestException(
        `Guest count exceeds property maximum of ${property.maxGuests}`,
      );
    }
    const nightsCount = countNights(checkIn, checkOut);
    if (nightsCount < property.minNights) {
      throw new BadRequestException(`Minimum stay is ${property.minNights} night(s)`);
    }
    if (property.maxNights !== null && nightsCount > property.maxNights) {
      throw new BadRequestException(`Maximum stay is ${property.maxNights} night(s)`);
    }
    const available = await this.availabilityService.isRangeAvailable(
      dto.propertyId,
      checkIn,
      checkOut,
    );
    if (!available) {
      throw new ConflictException('Selected dates are not available');
    }
    const pricing = await this.calculateStayPricing(property, checkIn, checkOut);
    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          propertyId: dto.propertyId,
          guestId,
          status: 'PENDING',
          checkIn,
          checkOut,
          guestCount: dto.guestCount,
          specialRequests: dto.specialRequests,
          currency: property.currency,
          nightlyRate: pricing.nightlyRate,
          nightsCount,
          cleaningFee: property.cleaningFee,
          securityDeposit: property.securityDeposit,
          totalAmount: pricing.totalAmount,
        },
      });
      await tx.conversation.create({ data: { bookingId: created.id } });
      return created;
    });
    await this.notificationsService.notify(
      property.host.userId,
      'BOOKING_REQUEST',
      booking.id,
      'booking',
    );
    return this.findById(booking.id, guestId, 'GUEST');
  }

  async confirm(bookingId: string, hostUserId: string): Promise<BookingDetail> {
    const booking = await this.getBookingOrThrow(bookingId);
    await this.assertHostOwnsBookingProperty(booking.propertyId, hostUserId);
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }
    const available = await this.availabilityService.isRangeAvailable(
      booking.propertyId,
      booking.checkIn,
      booking.checkOut,
      bookingId,
    );
    if (!available) {
      throw new ConflictException('Selected dates are no longer available');
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    });
    await this.availabilityService.blockDatesForBooking(
      booking.propertyId,
      booking.checkIn,
      booking.checkOut,
    );
    await this.notificationsService.notify(
      booking.guestId,
      'BOOKING_CONFIRMED',
      bookingId,
      'booking',
    );
    return this.findById(bookingId, hostUserId, 'HOST');
  }

  async cancel(
    bookingId: string,
    requestingUserId: string,
    role: string,
    dto: CancelBookingDto,
  ): Promise<BookingDetail> {
    const booking = await this.getBookingOrThrow(bookingId);
    const access = await this.resolveBookingAccess(booking, requestingUserId, role);
    if (!access.canCancel) {
      throw new ForbiddenException('You cannot cancel this booking');
    }
    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
      throw new BadRequestException('This booking cannot be cancelled');
    }
    const wasConfirmed = booking.status === 'CONFIRMED';
    const nextStatus: BookingStatus = access.asHost ? 'CANCELLED_BY_HOST' : 'CANCELLED_BY_GUEST';
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        cancellationReason: dto.reason,
        cancelledAt: new Date(),
      },
    });
    if (wasConfirmed) {
      await this.availabilityService.unblockDatesForBooking(
        booking.propertyId,
        booking.checkIn,
        booking.checkOut,
      );
    }
    const recipientId = access.asHost
      ? booking.guestId
      : await this.getHostUserId(booking.propertyId);
    await this.notificationsService.notify(recipientId, 'BOOKING_CANCELLED', bookingId, 'booking');
    return this.findById(bookingId, requestingUserId, role);
  }

  async complete(bookingId: string): Promise<BookingDetail> {
    const booking = await this.getBookingOrThrow(bookingId);
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed bookings can be completed');
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
    });
    return this.findById(bookingId, booking.guestId, 'ADMIN');
  }

  async attachPaymentRef(
    bookingId: string,
    guestId: string,
    externalPaymentRef: string,
  ): Promise<BookingDetail> {
    const booking = await this.getBookingOrThrow(bookingId);
    if (booking.guestId !== guestId) {
      throw new ForbiddenException('You can only attach payment to your own booking');
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { externalPaymentRef },
    });
    return this.findById(bookingId, guestId, 'GUEST');
  }

  async findById(id: string, requestingUserId: string, role: string): Promise<BookingDetail> {
    const booking = await this.getBookingOrThrow(id);
    const access = await this.resolveBookingAccess(booking, requestingUserId, role);
    if (!access.canView) {
      throw new ForbiddenException('You do not have access to this booking');
    }
    return this.toBookingDetail(booking);
  }

  async findAll(dto: QueryBookingsDto): Promise<PaginatedResponse<BookingDetail>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const where: Prisma.BookingWhereInput = {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.propertyId ? { propertyId: dto.propertyId } : {}),
    };
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    const data = await Promise.all(bookings.map((booking) => this.toBookingDetail(booking)));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findMyBookings(
    userId: string,
    role: string,
    dto: QueryBookingsDto,
  ): Promise<PaginatedResponse<BookingDetail>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const where = await this.buildMyBookingsWhere(userId, role, dto);
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    const data = await Promise.all(bookings.map((booking) => this.toBookingDetail(booking)));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private async buildMyBookingsWhere(
    userId: string,
    role: string,
    dto: QueryBookingsDto,
  ): Promise<Prisma.BookingWhereInput> {
    const filters: Prisma.BookingWhereInput = {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.propertyId ? { propertyId: dto.propertyId } : {}),
    };
    if (role === 'HOST') {
      const hostProfile = await this.hostProfilesService.findByUserId(userId);
      return {
        ...filters,
        property: { hostId: hostProfile.id },
      };
    }
    return {
      ...filters,
      guestId: userId,
    };
  }

  private async getBookingOrThrow(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private async assertHostOwnsBookingProperty(
    propertyId: string,
    hostUserId: string,
  ): Promise<void> {
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || property.hostId !== hostProfile.id) {
      throw new ForbiddenException('You do not own this property');
    }
  }

  private async getHostUserId(propertyId: string): Promise<string> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { host: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property.host.userId;
  }

  private async resolveBookingAccess(
    booking: Booking,
    requestingUserId: string,
    role: string,
  ): Promise<{ canView: boolean; canCancel: boolean; asHost: boolean }> {
    if (role === 'ADMIN' || role === 'STAFF') {
      return { canView: true, canCancel: true, asHost: false };
    }
    if (booking.guestId === requestingUserId) {
      return { canView: true, canCancel: true, asHost: false };
    }
    const hostProfile = await this.prisma.hostProfile.findUnique({
      where: { userId: requestingUserId },
    });
    if (hostProfile) {
      const property = await this.prisma.property.findUnique({
        where: { id: booking.propertyId },
      });
      if (property?.hostId === hostProfile.id) {
        return { canView: true, canCancel: true, asHost: true };
      }
    }
    return { canView: false, canCancel: false, asHost: false };
  }

  private async calculateStayPricing(
    property: Property,
    checkIn: Date,
    checkOut: Date,
  ): Promise<{ nightlyRate: number; totalAmount: number }> {
    const nights = eachNightBetween(checkIn, checkOut);
    const availabilityRows = await this.prisma.availability.findMany({
      where: {
        propertyId: property.id,
        date: { in: nights },
      },
    });
    const rowByDate = new Map(availabilityRows.map((row) => [formatIsoDate(row.date), row]));
    let accommodationTotal = 0;
    for (const night of nights) {
      const row = rowByDate.get(formatIsoDate(night));
      accommodationTotal += row?.priceOverride ?? property.pricePerNight;
    }
    const totalAmount = accommodationTotal + property.cleaningFee + property.securityDeposit;
    return {
      nightlyRate: Math.round(accommodationTotal / nights.length),
      totalAmount,
    };
  }

  private async toBookingDetail(booking: Booking): Promise<BookingDetail> {
    const [property, guest, conversation] = await Promise.all([
      this.prisma.property.findUnique({
        where: { id: booking.propertyId },
        include: {
          photos: { where: { isCover: true }, take: 1 },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: booking.guestId },
        include: { profile: true },
      }),
      this.prisma.conversation.findUnique({ where: { bookingId: booking.id } }),
    ]);
    if (!property || !guest) {
      throw new NotFoundException('Booking related data not found');
    }
    return {
      ...booking,
      property: {
        id: property.id,
        title: property.title,
        titleLabels:
          property.titleLabels && typeof property.titleLabels === 'object'
            ? (property.titleLabels as import('@repo/shared').PropertyTitleLabels)
            : null,
        slug: property.slug,
        city: property.city,
        country: property.country,
        coverPhotoUrl: await this.safeCoverPhotoUrl(property.photos[0]?.key),
      },
      guest: {
        id: guest.id,
        firstName: guest.profile?.firstName ?? null,
        lastName: guest.profile?.lastName ?? null,
        avatarUrl: guest.profile?.avatarKey ?? null,
      },
      conversationId: conversation?.id ?? null,
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

function validateStayDates(checkIn: Date, checkOut: Date): void {
  if (checkOut <= checkIn) {
    throw new BadRequestException('checkOut must be after checkIn');
  }
}

function countNights(checkIn: Date, checkOut: Date): number {
  return eachNightBetween(checkIn, checkOut).length;
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
