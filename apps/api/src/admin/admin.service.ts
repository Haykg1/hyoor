import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  Booking,
  BookingStatus,
  Property,
  PropertyPhoto,
  PropertyStatus,
  Prisma,
  User,
  UserRole,
} from '@repo/database/client';
import type {
  HostDashboardStats,
  HostListingSummary,
  HostListingsResponse,
  PaginatedResponse,
} from '@repo/shared';
import { AddressLocales } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { QueryAdminPropertiesDto } from './dto/query-admin-properties.dto';
import { QueryTimeseriesDto, TimeseriesMetric, TimeseriesRange } from './dto/query-timeseries.dto';
import { QueryUsersDto } from './dto/query-users.dto';

const S3_PRESIGNED_URL_EXPIRES = 3600;

const TIMESERIES_DEFAULT_DAYS = 30;
const RANGE_TO_TRUNC: Record<TimeseriesRange, string> = {
  [TimeseriesRange.DAY]: 'day',
  [TimeseriesRange.WEEK]: 'week',
  [TimeseriesRange.MONTH]: 'month',
};

export interface TimeseriesBucket {
  bucket: string;
  value: number;
}

export interface TimeseriesResponse {
  metric: TimeseriesMetric;
  range: TimeseriesRange;
  from: string;
  to: string;
  data: TimeseriesBucket[];
}

export interface AdminUserDetail {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  hostProfile: {
    id: string;
    isVerified: boolean;
    hostType: string;
    propertyCount: number;
  } | null;
  bookingCount: number;
}

export interface PlatformStats {
  users: {
    total: number;
    byRole: Record<string, number>;
    active: number;
  };
  properties: {
    total: number;
    byStatus: Record<string, number>;
  };
  bookings: {
    total: number;
    byStatus: Record<string, number>;
  };
  reviews: {
    total: number;
    avgRating: number | null;
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getUsers(dto: QueryUsersDto): Promise<PaginatedResponse<User>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.email ? { email: { contains: dto.email, mode: 'insensitive' } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { profile: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: data.map(({ passwordHash: _, ...u }) => u as unknown as User),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        hostProfile: {
          include: { _count: { select: { properties: true } } },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const bookingCount = await this.prisma.booking.count({ where: { guestId: id } });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
          }
        : null,
      hostProfile: user.hostProfile
        ? {
            id: user.hostProfile.id,
            isVerified: user.hostProfile.isVerified,
            hostType: user.hostProfile.hostType,
            propertyCount: user.hostProfile._count.properties,
          }
        : null,
      bookingCount,
    };
  }

  async setUserStatus(id: string, isActive: boolean): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
    }) as Promise<User>;
  }

  async setUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { role },
    }) as Promise<User>;
  }

  async getDashboardStats(): Promise<HostDashboardStats> {
    const [totalListings, activeListings, pendingReview, pendingBookings, revenueAgg] =
      await Promise.all([
        this.prisma.property.count({ where: { status: { not: 'INACTIVE' } } }),
        this.prisma.property.count({ where: { status: 'ACTIVE' } }),
        this.prisma.property.count({ where: { status: 'PENDING_REVIEW' } }),
        this.prisma.booking.count({ where: { status: 'PENDING' } }),
        this.prisma.booking.aggregate({
          where: { paymentStatus: 'PAID' },
          _sum: { totalAmount: true },
        }),
      ]);
    return {
      totalListings,
      activeListings,
      pendingRequests: pendingReview + pendingBookings,
      upcomingReservations: 0,
      pastReservations: 0,
      totalEarnings: revenueAgg._sum.totalAmount ?? 0,
    };
  }

  async findListings(dto: QueryAdminPropertiesDto): Promise<HostListingsResponse> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;
    const isDisabledTab = dto.tab === 'disabled';
    const statusWhere: Prisma.PropertyWhereInput = isDisabledTab
      ? { status: 'INACTIVE' }
      : dto.status
        ? { status: dto.status }
        : { status: { not: 'INACTIVE' } };
    const typeWhere: Prisma.PropertyWhereInput = dto.propertyType
      ? { propertyType: dto.propertyType }
      : {};
    const searchWhere: Prisma.PropertyWhereInput = dto.search
      ? {
          OR: [
            { title: { contains: dto.search, mode: 'insensitive' } },
            ...AddressLocales.map((loc) => ({
              titleLabels: {
                path: [loc],
                string_contains: dto.search,
              } as Prisma.JsonNullableFilter<'Property'>,
            })),
            { slug: { contains: dto.search, mode: 'insensitive' } },
            { description: { contains: dto.search, mode: 'insensitive' } },
            { city: { contains: dto.search, mode: 'insensitive' } },
            { region: { contains: dto.search, mode: 'insensitive' } },
            { country: { contains: dto.search, mode: 'insensitive' } },
            { street: { contains: dto.search, mode: 'insensitive' } },
            { formattedAddress: { contains: dto.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const where: Prisma.PropertyWhereInput = {
      ...statusWhere,
      ...typeWhere,
      ...searchWhere,
    };
    const [properties, total, stats] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { photos: { where: { isCover: true }, take: 1 } },
      }),
      this.prisma.property.count({ where }),
      this.getDashboardStats(),
    ]);
    const data = await Promise.all(properties.map((p) => this.toListingSummary(p)));
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1, stats };
  }

  async setPropertyStatus(id: string, status: PropertyStatus): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return this.prisma.property.update({ where: { id }, data: { status } });
  }

  private async safePresignedUrl(key: string): Promise<string | undefined> {
    if (!this.storage.isConfigured) return undefined;
    try {
      return await this.storage.getPresignedUrl(key, S3_PRESIGNED_URL_EXPIRES);
    } catch (err) {
      this.logger.warn(
        `Failed to presign S3 object '${key}': ${err instanceof Error ? err.message : err}. Returning no URL.`,
      );
      return undefined;
    }
  }

  private async toListingSummary(
    property: Property & { photos: PropertyPhoto[] },
  ): Promise<HostListingSummary> {
    const coverPhoto = property.photos[0];
    const coverPhotoUrl = coverPhoto ? await this.safePresignedUrl(coverPhoto.key) : undefined;
    return {
      id: property.id,
      title: property.title,
      titleLabels:
        property.titleLabels && typeof property.titleLabels === 'object'
          ? (property.titleLabels as HostListingSummary['titleLabels'])
          : null,
      status: property.status as HostListingSummary['status'],
      propertyType: property.propertyType as HostListingSummary['propertyType'],
      city: property.city,
      region: property.region,
      pricePerNight: property.pricePerNight,
      currency: property.currency,
      coverPhotoUrl,
    };
  }

  async getBookings(dto: QueryAdminBookingsDto): Promise<PaginatedResponse<Booking>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const where: Prisma.BookingWhereInput = {
      ...(dto.status ? { status: dto.status as BookingStatus } : {}),
      ...(dto.propertyId ? { propertyId: dto.propertyId } : {}),
      ...(dto.from || dto.to
        ? {
            checkIn: {
              ...(dto.from ? { gte: new Date(dto.from) } : {}),
              ...(dto.to ? { lte: new Date(dto.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStats(): Promise<PlatformStats> {
    const [
      totalUsers,
      usersByRole,
      activeUsers,
      totalProperties,
      propertiesByStatus,
      totalBookings,
      bookingsByStatus,
      reviewAggregate,
      totalReviews,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.property.count(),
      this.prisma.property.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.booking.count(),
      this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.review.aggregate({
        where: { isPublished: true, target: 'PROPERTY' },
        _avg: { rating: true },
      }),
      this.prisma.review.count({ where: { isPublished: true } }),
    ]);

    return {
      users: {
        total: totalUsers,
        byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all])),
        active: activeUsers,
      },
      properties: {
        total: totalProperties,
        byStatus: Object.fromEntries(propertiesByStatus.map((r) => [r.status, r._count._all])),
      },
      bookings: {
        total: totalBookings,
        byStatus: Object.fromEntries(bookingsByStatus.map((r) => [r.status, r._count._all])),
      },
      reviews: {
        total: totalReviews,
        avgRating: reviewAggregate._avg.rating,
      },
    };
  }

  async getTimeseries(dto: QueryTimeseriesDto): Promise<TimeseriesResponse> {
    const metric = dto.metric ?? TimeseriesMetric.BOOKINGS;
    const range = dto.range ?? TimeseriesRange.DAY;
    const { from, to } = resolveTimeseriesWindow(dto.from, dto.to);
    const trunc = RANGE_TO_TRUNC[range];
    const rows = await this.queryTimeseriesRows(metric, trunc, from, to);
    return {
      metric,
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      data: rows.map((row) => ({
        bucket: row.bucket.toISOString(),
        value: Number(row.value ?? 0),
      })),
    };
  }

  private async queryTimeseriesRows(
    metric: TimeseriesMetric,
    trunc: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ bucket: Date; value: bigint | number | null }>> {
    if (metric === TimeseriesMetric.USERS) {
      return this.prisma.$queryRaw<Array<{ bucket: Date; value: bigint }>>`
        SELECT date_trunc(${trunc}, "createdAt") AS bucket, COUNT(*)::bigint AS value
        FROM "users"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
    }
    if (metric === TimeseriesMetric.BOOKINGS) {
      return this.prisma.$queryRaw<Array<{ bucket: Date; value: bigint }>>`
        SELECT date_trunc(${trunc}, "createdAt") AS bucket, COUNT(*)::bigint AS value
        FROM "bookings"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
    }
    if (metric === TimeseriesMetric.REVENUE) {
      return this.prisma.$queryRaw<Array<{ bucket: Date; value: bigint }>>`
        SELECT date_trunc(${trunc}, "paymentCompletedAt") AS bucket, SUM("totalAmount")::bigint AS value
        FROM "bookings"
        WHERE "paymentStatus" = 'PAID'
          AND "paymentCompletedAt" IS NOT NULL
          AND "paymentCompletedAt" >= ${from}
          AND "paymentCompletedAt" < ${to}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
    }
    throw new BadRequestException(`Unsupported metric: ${metric}`);
  }
}

function resolveTimeseriesWindow(
  fromInput: string | undefined,
  toInput: string | undefined,
): { from: Date; to: Date } {
  const to = toInput ? parseDateOrThrow(toInput, 'to') : new Date();
  const from = fromInput
    ? parseDateOrThrow(fromInput, 'from')
    : new Date(to.getTime() - TIMESERIES_DEFAULT_DAYS * 24 * 60 * 60 * 1000);
  if (from >= to) {
    throw new BadRequestException('from must be before to');
  }
  return { from, to };
}

function parseDateOrThrow(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid ${field} date`);
  }
  return parsed;
}
