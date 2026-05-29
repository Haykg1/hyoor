import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  Prisma,
  Property,
  PropertyAmenity,
  PropertyPhoto,
  PropertyStatus,
} from '@repo/database/client';
import type {
  HostDashboardStats,
  HostListingsResponse,
  HostListingSummary,
  PaginatedResponse,
  PresignedPhotoUrlResponse,
  PropertySummary,
} from '@repo/shared';
import {
  DEFAULT_PAGE_SIZE,
  MAX_UPLOAD_BYTES,
  S3_PRESIGNED_URL_EXPIRES,
} from '@repo/shared/constants';
import { slugify } from '@repo/shared/utils';

import { PrismaService } from '../database/prisma.service';
import {
  HostProfilesService,
  type PublicHostProfile,
} from '../host-profiles/host-profiles.service';
import { StorageService } from '../storage/storage.service';

import { AmenityDto } from './dto/amenity.dto';
import { ConfirmPhotoUploadDto } from './dto/confirm-photo-upload.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryMyPropertiesDto } from './dto/query-my-properties.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BLOCKING_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;

export interface PropertyPhotoView extends PropertyPhoto {
  url: string;
}

export interface PropertyDetail extends Property {
  photos: PropertyPhotoView[];
  amenities: PropertyAmenity[];
  host: PublicHostProfile;
  avgRating: number | null;
  reviewCount: number;
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly hostProfilesService: HostProfilesService,
  ) {}

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

  async create(hostUserId: string, dto: CreatePropertyDto): Promise<Property> {
    this.validateHouseAddress(dto);
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    const slug = await this.generateUniqueSlug(dto.title);
    return this.prisma.property.create({
      data: {
        hostId: hostProfile.id,
        status: 'PENDING_REVIEW',
        title: dto.title,
        slug,
        description: dto.description,
        propertyType: dto.propertyType,
        city: dto.city,
        maxGuests: dto.maxGuests,
        maxAdults: dto.maxAdults ?? 0,
        maxChildren: dto.maxChildren ?? 0,
        maxInfants: dto.maxInfants ?? 0,
        bedrooms: dto.bedrooms,
        beds: dto.beds,
        bathrooms: new Decimal(dto.bathrooms),
        pricePerNight: dto.pricePerNight,
        cancellationPolicy: dto.cancellationPolicy,
        country: dto.country,
        region: dto.region,
        street: dto.street,
        buildingNumber: dto.buildingNumber,
        formattedAddress: dto.formattedAddress,
        placeKind: dto.placeKind,
        apartmentNumber: dto.apartmentNumber,
        addressLine: dto.addressLine,
        latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
        longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
        currency: dto.currency,
        cleaningFee: dto.cleaningFee,
        securityDeposit: dto.securityDeposit,
        minNights: dto.minNights,
        maxNights: dto.maxNights,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        smokingAllowed: dto.smokingAllowed,
        petsAllowed: dto.petsAllowed,
        partiesAllowed: dto.partiesAllowed,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        additionalRules: dto.additionalRules,
        externalBookingUrl: dto.externalBookingUrl,
      },
    });
  }

  private buildBaseWhere(): Prisma.PropertyWhereInput {
    return { status: 'ACTIVE' };
  }

  private validateHouseAddress(dto: {
    placeKind?: string;
    buildingNumber?: string;
    street?: string;
    latitude?: number;
    longitude?: number;
  }): void {
    if (dto.placeKind !== 'house') {
      throw new BadRequestException(
        'Property address must be a verified building selected from geocoding',
      );
    }
    if (!dto.buildingNumber?.trim() || !dto.street?.trim()) {
      throw new BadRequestException('Building number and street are required');
    }
    if (dto.latitude === undefined || dto.longitude === undefined) {
      throw new BadRequestException('Property coordinates are required');
    }
  }

  private buildLocationWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    if (dto.searchPlaceKind === 'house' && dto.searchStreet && dto.searchBuildingNumber) {
      return {
        ...(dto.region ? { region: { equals: dto.region, mode: 'insensitive' } } : {}),
        ...(dto.searchCity ? { city: { equals: dto.searchCity, mode: 'insensitive' } } : {}),
        street: { equals: dto.searchStreet, mode: 'insensitive' },
        buildingNumber: { equals: dto.searchBuildingNumber, mode: 'insensitive' },
      };
    }
    if (dto.searchCity) {
      return {
        ...(dto.region ? { region: { equals: dto.region, mode: 'insensitive' } } : {}),
        city: { equals: dto.searchCity, mode: 'insensitive' },
      };
    }
    return {
      ...(dto.city ? { city: { equals: dto.city, mode: 'insensitive' } } : {}),
      ...(dto.country ? { country: { equals: dto.country, mode: 'insensitive' } } : {}),
      ...(dto.region ? { region: { equals: dto.region, mode: 'insensitive' } } : {}),
    };
  }

  private buildTypeWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    return dto.propertyType ? { propertyType: dto.propertyType } : {};
  }

  private buildFeaturedWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    return dto.featured !== undefined ? { featured: dto.featured } : {};
  }

  private buildPriceWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    if (dto.minPrice === undefined && dto.maxPrice === undefined) return {};
    return {
      pricePerNight: {
        ...(dto.minPrice !== undefined ? { gte: dto.minPrice } : {}),
        ...(dto.maxPrice !== undefined ? { lte: dto.maxPrice } : {}),
      },
    };
  }

  private buildFeesWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {};
    if (dto.minCleaningFee !== undefined || dto.maxCleaningFee !== undefined) {
      where.cleaningFee = {
        ...(dto.minCleaningFee !== undefined ? { gte: dto.minCleaningFee } : {}),
        ...(dto.maxCleaningFee !== undefined ? { lte: dto.maxCleaningFee } : {}),
      };
    }
    if (dto.minSecurityDeposit !== undefined || dto.maxSecurityDeposit !== undefined) {
      where.securityDeposit = {
        ...(dto.minSecurityDeposit !== undefined ? { gte: dto.minSecurityDeposit } : {}),
        ...(dto.maxSecurityDeposit !== undefined ? { lte: dto.maxSecurityDeposit } : {}),
      };
    }
    return where;
  }

  private buildCapacityWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    return {
      ...(dto.maxGuests !== undefined ? { maxGuests: { gte: dto.maxGuests } } : {}),
      ...(dto.minAdults !== undefined ? { maxAdults: { gte: dto.minAdults } } : {}),
      ...(dto.minChildren !== undefined ? { maxChildren: { gte: dto.minChildren } } : {}),
      ...(dto.minInfants !== undefined ? { maxInfants: { gte: dto.minInfants } } : {}),
    };
  }

  private buildRoomsWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    return {
      ...(dto.minBedrooms !== undefined ? { bedrooms: { gte: dto.minBedrooms } } : {}),
      ...(dto.minBeds !== undefined ? { beds: { gte: dto.minBeds } } : {}),
      ...(dto.minBathrooms !== undefined
        ? { bathrooms: { gte: new Decimal(dto.minBathrooms) } }
        : {}),
    };
  }

  private buildStayRulesWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {};
    if (dto.minNights !== undefined) {
      where.minNights = { lte: dto.minNights };
    }
    if (dto.maxNights !== undefined) {
      where.OR = [{ maxNights: null }, { maxNights: { gte: dto.maxNights } }];
    }
    return where;
  }

  private buildHouseRulesWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    return {
      ...(dto.smokingAllowed !== undefined ? { smokingAllowed: dto.smokingAllowed } : {}),
      ...(dto.petsAllowed !== undefined ? { petsAllowed: dto.petsAllowed } : {}),
      ...(dto.partiesAllowed !== undefined ? { partiesAllowed: dto.partiesAllowed } : {}),
    };
  }

  private buildAmenitiesAndWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput[] {
    const names = (dto.amenities ?? []).map((a) => a.trim()).filter((a) => a.length > 0);
    if (names.length === 0) return [];
    return names.map((name) => ({ amenities: { some: { name } } }));
  }

  private buildOrderBy(dto: SearchPropertiesDto): Prisma.PropertyOrderByWithRelationInput {
    return dto.sortBy === 'pricePerNight'
      ? { pricePerNight: 'asc' as const }
      : { createdAt: 'desc' as const };
  }

  private async getRatedPropertyIds(dto: SearchPropertiesDto): Promise<string[] | null> {
    const needsRatingFilter = dto.minAvgRating !== undefined || dto.minReviewCount !== undefined;
    if (!needsRatingFilter) return null;
    const groups = await this.prisma.review.groupBy({
      by: ['propertyId'],
      where: {
        target: 'PROPERTY',
        isPublished: true,
        propertyId: { not: null },
      },
      having: {
        ...(dto.minAvgRating !== undefined ? { rating: { _avg: { gte: dto.minAvgRating } } } : {}),
        ...(dto.minReviewCount !== undefined
          ? { id: { _count: { gte: dto.minReviewCount } } }
          : {}),
      },
    });
    return groups.map((g) => g.propertyId).filter((id): id is string => typeof id === 'string');
  }

  async search(dto: SearchPropertiesDto): Promise<PaginatedResponse<PropertySummary>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    if ((dto.checkIn && !dto.checkOut) || (!dto.checkIn && dto.checkOut)) {
      throw new BadRequestException('Both checkIn and checkOut are required for date filtering');
    }
    const [unavailablePropertyIds, ratedPropertyIds] = await Promise.all([
      this.getUnavailablePropertyIds(dto.checkIn, dto.checkOut),
      this.getRatedPropertyIds(dto),
    ]);
    if (ratedPropertyIds && ratedPropertyIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 1 };
    }
    const andClauses: Prisma.PropertyWhereInput[] = [
      this.buildBaseWhere(),
      this.buildLocationWhere(dto),
      this.buildTypeWhere(dto),
      this.buildFeaturedWhere(dto),
      this.buildPriceWhere(dto),
      this.buildFeesWhere(dto),
      this.buildCapacityWhere(dto),
      this.buildRoomsWhere(dto),
      this.buildStayRulesWhere(dto),
      this.buildHouseRulesWhere(dto),
      ...this.buildAmenitiesAndWhere(dto),
      ...(unavailablePropertyIds.length > 0 ? [{ id: { notIn: unavailablePropertyIds } }] : []),
      ...(ratedPropertyIds ? [{ id: { in: ratedPropertyIds } }] : []),
    ].filter((w) => Object.keys(w).length > 0);
    const where: Prisma.PropertyWhereInput = { AND: andClauses };
    const orderBy = this.buildOrderBy(dto);
    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          photos: { where: { isCover: true }, take: 1 },
          _count: { select: { reviews: { where: { isPublished: true, target: 'PROPERTY' } } } },
          reviews: {
            where: { isPublished: true, target: 'PROPERTY' },
            select: { rating: true },
          },
        },
      }),
      this.prisma.property.count({ where }),
    ]);
    const summaries = await Promise.all(
      properties.map((property) => this.toPropertySummary(property)),
    );
    return { data: summaries, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findById(id: string, requestingUserId?: string): Promise<PropertyDetail> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { name: 'asc' } },
        host: true,
        reviews: { where: { isPublished: true, target: 'PROPERTY' }, select: { rating: true } },
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    const canView = await this.canViewProperty(property, requestingUserId);
    if (!canView) {
      throw new NotFoundException('Property not found');
    }
    const photos = await Promise.all(
      property.photos.map(async (photo) => ({
        ...photo,
        url: (await this.safePresignedUrl(photo.key)) ?? '',
      })),
    );
    const host = await this.hostProfilesService.getPublicProfile(property.hostId);
    const reviewCount = property.reviews.length;
    const avgRating =
      reviewCount > 0
        ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : null;
    return {
      ...property,
      photos,
      host,
      avgRating,
      reviewCount,
    };
  }

  async findMyListings(
    hostUserId: string,
    dto: QueryMyPropertiesDto,
  ): Promise<HostListingsResponse> {
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
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
            { slug: { contains: dto.search, mode: 'insensitive' } },
            { description: { contains: dto.search, mode: 'insensitive' } },
            { city: { contains: dto.search, mode: 'insensitive' } },
            { region: { contains: dto.search, mode: 'insensitive' } },
            { country: { contains: dto.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const where: Prisma.PropertyWhereInput = {
      hostId: hostProfile.id,
      ...statusWhere,
      ...typeWhere,
      ...searchWhere,
    };
    const [properties, total, totalListings, activeListings] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { photos: { where: { isCover: true }, take: 1 } },
      }),
      this.prisma.property.count({ where }),
      this.prisma.property.count({
        where: { hostId: hostProfile.id, status: { not: 'INACTIVE' } },
      }),
      this.prisma.property.count({ where: { hostId: hostProfile.id, status: 'ACTIVE' } }),
    ]);
    const data = await Promise.all(properties.map((p) => this.toHostListingSummary(p)));
    const stats: HostDashboardStats = {
      totalListings,
      activeListings,
      pendingRequests: 0,
      totalEarnings: 0,
    };
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1, stats };
  }

  async update(id: string, hostUserId: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await this.getOwnedProperty(id, hostUserId);
    const hasAddressUpdate =
      dto.placeKind !== undefined ||
      dto.buildingNumber !== undefined ||
      dto.street !== undefined ||
      dto.latitude !== undefined ||
      dto.longitude !== undefined;
    if (hasAddressUpdate) {
      this.validateHouseAddress({
        placeKind: dto.placeKind ?? property.placeKind ?? undefined,
        buildingNumber: dto.buildingNumber ?? property.buildingNumber ?? undefined,
        street: dto.street ?? property.street ?? undefined,
        latitude:
          dto.latitude ?? (property.latitude !== null ? Number(property.latitude) : undefined),
        longitude:
          dto.longitude ?? (property.longitude !== null ? Number(property.longitude) : undefined),
      });
    }
    const data: Prisma.PropertyUpdateInput = {
      ...dto,
      bathrooms: dto.bathrooms !== undefined ? new Decimal(dto.bathrooms) : undefined,
      latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
      longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
    };
    if (dto.title && dto.title !== property.title) {
      data.slug = await this.generateUniqueSlug(dto.title, property.id);
    }
    return this.prisma.property.update({
      where: { id: property.id },
      data,
    });
  }

  async softDelete(id: string, hostUserId: string): Promise<{ success: true }> {
    const property = await this.getOwnedProperty(id, hostUserId);
    await this.prisma.property.update({
      where: { id: property.id },
      data: { status: 'INACTIVE' },
    });
    return { success: true };
  }

  async reactivate(id: string, hostUserId: string): Promise<Property> {
    const property = await this.getOwnedProperty(id, hostUserId);
    if (property.status !== 'INACTIVE') {
      throw new BadRequestException('Only inactive listings can be reactivated');
    }
    return this.prisma.property.update({
      where: { id: property.id },
      data: { status: 'ACTIVE' },
    });
  }

  async updateStatus(id: string, status: PropertyStatus): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return this.prisma.property.update({
      where: { id },
      data: { status },
    });
  }

  async createPhotoUploadUrl(
    propertyId: string,
    hostUserId: string,
    mimeType: string,
  ): Promise<PresignedPhotoUrlResponse> {
    if (!ALLOWED_PHOTO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, or WebP image');
    }
    await this.getOwnedProperty(propertyId, hostUserId);
    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const key = `properties/${propertyId}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.storage.getPresignedUploadUrl(
      key,
      mimeType,
      S3_PRESIGNED_URL_EXPIRES,
    );
    return { uploadUrl, key };
  }

  async confirmPhotoUpload(
    propertyId: string,
    hostUserId: string,
    dto: ConfirmPhotoUploadDto,
  ): Promise<PropertyPhotoView> {
    await this.getOwnedProperty(propertyId, hostUserId);
    const expectedPrefix = `properties/${propertyId}/`;
    if (!dto.key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid photo key for this property');
    }
    const existingPhotos = await this.prisma.propertyPhoto.count({ where: { propertyId } });
    if (dto.isCover) {
      await this.prisma.propertyPhoto.updateMany({
        where: { propertyId, isCover: true },
        data: { isCover: false },
      });
    }
    const photo = await this.prisma.propertyPhoto.create({
      data: {
        propertyId,
        key: dto.key,
        caption: dto.caption,
        sortOrder: dto.sortOrder ?? existingPhotos,
        isCover: dto.isCover ?? existingPhotos === 0,
      },
    });
    const url = await this.storage.getPresignedUrl(photo.key, S3_PRESIGNED_URL_EXPIRES);
    return { ...photo, url };
  }

  async uploadPhoto(
    propertyId: string,
    hostUserId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<PropertyPhotoView> {
    if (!ALLOWED_PHOTO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, or WebP image');
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Photo must be smaller than 5MB');
    }
    await this.getOwnedProperty(propertyId, hostUserId);
    const key = `properties/${propertyId}/${randomUUID()}.jpg`;
    await this.storage.uploadFile(key, buffer, mimeType);
    const existingPhotos = await this.prisma.propertyPhoto.count({ where: { propertyId } });
    const photo = await this.prisma.propertyPhoto.create({
      data: {
        propertyId,
        key,
        sortOrder: existingPhotos,
        isCover: existingPhotos === 0,
      },
    });
    const url = await this.storage.getPresignedUrl(key, S3_PRESIGNED_URL_EXPIRES);
    return { ...photo, url };
  }

  async updatePhoto(
    propertyId: string,
    photoId: string,
    hostUserId: string,
    dto: UpdatePhotoDto,
  ): Promise<PropertyPhotoView> {
    await this.getOwnedProperty(propertyId, hostUserId);
    const photo = await this.prisma.propertyPhoto.findFirst({
      where: { id: photoId, propertyId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    if (dto.isCover) {
      await this.prisma.propertyPhoto.updateMany({
        where: { propertyId, isCover: true },
        data: { isCover: false },
      });
    }
    const updated = await this.prisma.propertyPhoto.update({
      where: { id: photoId },
      data: dto,
    });
    const url = await this.storage.getPresignedUrl(updated.key, S3_PRESIGNED_URL_EXPIRES);
    return { ...updated, url };
  }

  async deletePhoto(
    propertyId: string,
    photoId: string,
    hostUserId: string,
  ): Promise<{ success: true }> {
    await this.getOwnedProperty(propertyId, hostUserId);
    const photo = await this.prisma.propertyPhoto.findFirst({
      where: { id: photoId, propertyId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    await this.storage.deleteFile(photo.key);
    await this.prisma.propertyPhoto.delete({ where: { id: photoId } });
    if (photo.isCover) {
      const nextCover = await this.prisma.propertyPhoto.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      });
      if (nextCover) {
        await this.prisma.propertyPhoto.update({
          where: { id: nextCover.id },
          data: { isCover: true },
        });
      }
    }
    return { success: true };
  }

  async replaceAmenities(
    propertyId: string,
    hostUserId: string,
    amenities: AmenityDto[],
  ): Promise<PropertyAmenity[]> {
    await this.getOwnedProperty(propertyId, hostUserId);
    await this.prisma.propertyAmenity.deleteMany({ where: { propertyId } });
    if (amenities.length === 0) {
      return [];
    }
    await this.prisma.propertyAmenity.createMany({
      data: amenities.map((amenity) => ({
        propertyId,
        name: amenity.name,
        category: amenity.category,
        iconKey: amenity.iconKey,
      })),
    });
    return this.prisma.propertyAmenity.findMany({
      where: { propertyId },
      orderBy: { name: 'asc' },
    });
  }

  private async getOwnedProperty(
    propertyId: string,
    hostUserId: string,
  ): Promise<Property & { host: { userId: string } }> {
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { host: { select: { userId: true } } },
    });
    if (!property || property.hostId !== hostProfile.id) {
      throw new ForbiddenException('You do not own this property');
    }
    return property;
  }

  private async canViewProperty(
    property: Property & { host: { userId: string } },
    requestingUserId?: string,
  ): Promise<boolean> {
    if (property.status === 'ACTIVE') {
      return true;
    }
    if (!requestingUserId) {
      return false;
    }
    if (property.host.userId === requestingUserId) {
      return true;
    }
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
    return user?.role === 'ADMIN' || user?.role === 'STAFF';
  }

  private async generateUniqueSlug(title: string, excludePropertyId?: string): Promise<string> {
    const base = slugify(title) || 'property';
    let slug = base;
    let counter = 1;
    let existing = await this.prisma.property.findUnique({ where: { slug } });
    while (existing && existing.id !== excludePropertyId) {
      slug = `${base}-${counter++}`;
      existing = await this.prisma.property.findUnique({ where: { slug } });
    }
    return slug;
  }

  private async getUnavailablePropertyIds(checkIn?: string, checkOut?: string): Promise<string[]> {
    if (!checkIn || !checkOut) {
      return [];
    }
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      throw new BadRequestException('Invalid checkIn or checkOut date');
    }
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('checkOut must be after checkIn');
    }
    const [bookings, blockedAvailability] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          status: { in: [...BLOCKING_BOOKING_STATUSES] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
        select: { propertyId: true },
      }),
      this.prisma.availability.findMany({
        where: {
          isAvailable: false,
          date: { gte: checkInDate, lt: checkOutDate },
        },
        select: { propertyId: true },
      }),
    ]);
    return [...new Set([...bookings, ...blockedAvailability].map((row) => row.propertyId))];
  }

  private async toPropertySummary(
    property: Property & {
      photos: PropertyPhoto[];
      reviews: { rating: number }[];
      _count: { reviews: number };
    },
  ): Promise<PropertySummary> {
    const coverPhoto = property.photos[0];
    const coverPhotoUrl = coverPhoto ? await this.safePresignedUrl(coverPhoto.key) : undefined;
    const reviewCount = property._count.reviews;
    const avgRating =
      property.reviews.length > 0
        ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
        : undefined;
    return {
      id: property.id,
      title: property.title,
      slug: property.slug,
      propertyType: property.propertyType,
      city: property.city,
      region: property.region,
      country: property.country,
      pricePerNight: property.pricePerNight,
      currency: property.currency,
      coverPhotoUrl,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      avgRating,
      reviewCount,
      featured: property.featured,
    };
  }

  private async toHostListingSummary(
    property: Property & { photos: PropertyPhoto[] },
  ): Promise<HostListingSummary> {
    const coverPhoto = property.photos[0];
    const coverPhotoUrl = coverPhoto ? await this.safePresignedUrl(coverPhoto.key) : undefined;
    return {
      id: property.id,
      title: property.title,
      status: property.status as import('@repo/shared').PropertyStatus,
      propertyType: property.propertyType as import('@repo/shared').PropertyType,
      city: property.city,
      region: property.region,
      pricePerNight: property.pricePerNight,
      currency: property.currency,
      coverPhotoUrl,
    };
  }
}
