import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/database/client';
import type {
  Property,
  PropertyAmenity,
  PropertyPhoto,
  PropertyStatus,
} from '@repo/database/client';
import type {
  DisplayPrice,
  HostDashboardStats,
  HostListingsResponse,
  HostListingSummary,
  PaginatedResponse,
  PresignedPhotoUrlResponse,
  PropertyAddressLabels,
  PropertyFeaturedPoiView,
  PropertySortValue,
  PropertySummary,
  PropertyTitleLabels,
} from '@repo/shared';
import {
  AddressLocales,
  MAX_CANCELLATION_FEE_PERCENT,
  MAX_FEATURED_POIS,
  normalizePropertySortBy,
  sanitizeSearchDateFields,
  todayIsoUtc,
  type CancellationFeeType,
} from '@repo/shared';
import {
  DEFAULT_PAGE_SIZE,
  expandCityFilterValues,
  MAX_UPLOAD_BYTES,
  S3_PRESIGNED_URL_EXPIRES,
} from '@repo/shared/constants';
import { findPoiById, getDestinationDataset } from '@repo/shared/data/poi-datasets';
import {
  computeDistanceKm,
  computeDistanceMeters,
  resolveDestinationCitySlug,
  slugify,
} from '@repo/shared/utils';

import { sanitizeGuestInstructionsHtml } from '../common/utils/sanitize-html';
import type { CurrencyRates } from '../currency/currency.service';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import { GeocodingService } from '../geocoding/geocoding.service';
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
import {
  addDays,
  buildBlockedDatesForProperty,
  diffDaysInclusive,
  findFirstFlexibleStaySlot,
  type FlexibleStayMatch,
  MAX_FLEXIBLE_WINDOW_DAYS,
  utcDateFromString,
} from './flexible-availability';

const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BLOCKING_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;
const FLEXIBLE_SEARCH_CANDIDATE_CAP = 200;
const HOUSE_COORD_DELTA = 0.00045;
const KM_PER_DEGREE_LAT = 111;
const DEFAULT_RADIUS_KM = 8;
const DEFAULT_RADIUS_KM_BY_KIND: Record<string, number> = {
  house: 0.05,
  street: 0.7,
  landmark: 1.2,
  metro: 1.5,
  district: 4,
  area: 5,
  locality: 8,
};
const GEO_DISTANCE_CANDIDATE_CAP = FLEXIBLE_SEARCH_CANDIDATE_CAP;
const GEO_INELIGIBLE_KINDS = new Set(['province', 'country']);

export interface PropertyPhotoView extends PropertyPhoto {
  url: string;
}

export interface PropertyDetail extends Omit<Property, 'addressLabels' | 'titleLabels'> {
  photos: PropertyPhotoView[];
  amenities: PropertyAmenity[];
  host: PublicHostProfile;
  avgRating: number | null;
  reviewCount: number;
  addressLabels: PropertyAddressLabels | null;
  titleLabels: PropertyTitleLabels | null;
  featuredPois: PropertyFeaturedPoiView[];
  displayPrice: DisplayPrice | null;
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly hostProfilesService: HostProfilesService,
    private readonly geocoding: GeocodingService,
    private readonly currencyService: CurrencyService,
  ) {}

  /** Minor units per major unit (100 for cent-based currencies, 1 for whole-unit ones like AMD). */
  private minorUnitFactor(currency: string): number {
    return currency === 'AMD' ? 1 : 100;
  }

  /** Returns the price in minor units of the guest display currency. */
  private buildDisplayPrice(
    pricePerNight: number,
    currency: string,
    displayCurrency: string | undefined,
    rates: CurrencyRates | null,
  ): DisplayPrice | null {
    if (!displayCurrency) return null;
    if (currency === displayCurrency) {
      return { amount: pricePerNight, currency: displayCurrency };
    }
    if (!rates) return null;
    const major = pricePerNight / this.minorUnitFactor(currency);
    const converted = this.currencyService.convert(major, currency, displayCurrency, rates);
    if (converted === null) return null;
    return {
      amount: Math.round(converted * this.minorUnitFactor(displayCurrency)),
      currency: displayCurrency,
    };
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

  async create(hostUserId: string, dto: CreatePropertyDto): Promise<Property> {
    return this.createForHost(hostUserId, dto, { status: 'PENDING_REVIEW' });
  }

  /**
   * Create a property with an explicit initial status. Used by the listing
   * wizard (PENDING_REVIEW) and the bulk import pipeline (DRAFT).
   */
  async createForHost(
    hostUserId: string,
    dto: CreatePropertyDto,
    options: { status: 'DRAFT' | 'PENDING_REVIEW' } = { status: 'PENDING_REVIEW' },
  ): Promise<Property> {
    this.validateHouseAddress(dto);
    this.validateFeaturedPoiIds(dto.featuredPoiIds, dto.city, dto.region);
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    await this.assertNotDuplicateAddress(hostProfile.id, dto);
    const slug = await this.generateUniqueSlug(dto.title);
    const addressLabels = await this.geocoding.resolveAddressLabels(dto.latitude!, dto.longitude!);
    return this.prisma.property.create({
      data: {
        hostId: hostProfile.id,
        status: options.status,
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
        bathrooms: new Prisma.Decimal(dto.bathrooms),
        pricePerNight: dto.pricePerNight,
        cancellationPolicy: dto.cancellationPolicy,
        ...resolveCancellationFeeFields({
          cancellationPolicy: dto.cancellationPolicy,
          cancellationFeeType: dto.cancellationFeeType,
          cancellationFeeValue: dto.cancellationFeeValue,
          pricePerNight: dto.pricePerNight,
        }),
        country: dto.country,
        region: dto.region,
        street: dto.street,
        buildingNumber: dto.buildingNumber,
        formattedAddress: dto.formattedAddress,
        placeKind: dto.placeKind,
        addressLabels: addressLabels as unknown as Prisma.InputJsonValue,
        titleLabels: this.sanitizeTitleLabels(dto.titleLabels) as unknown as Prisma.InputJsonValue,
        apartmentNumber: dto.apartmentNumber,
        addressLine: dto.addressLine,
        latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined,
        longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : undefined,
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
        guestInstructions: sanitizeGuestInstructionsHtml(dto.guestInstructions),
        externalBookingUrl: dto.externalBookingUrl,
        featuredPoiIds: dto.featuredPoiIds ?? [],
      },
    });
  }

  private validateFeaturedPoiIds(
    poiIds: string[] | undefined,
    city: string,
    region?: string | null,
  ): void {
    if (!poiIds || poiIds.length === 0) return;
    if (poiIds.length > MAX_FEATURED_POIS) {
      throw new BadRequestException(`At most ${MAX_FEATURED_POIS} featured POIs are allowed`);
    }
    const uniqueIds = new Set(poiIds);
    if (uniqueIds.size !== poiIds.length) {
      throw new BadRequestException('Featured POI ids must be unique');
    }
    const citySlug = resolveDestinationCitySlug(city, region);
    if (!citySlug) {
      throw new BadRequestException('No destination POI catalog is available for this city');
    }
    const dataset = getDestinationDataset(citySlug);
    if (!dataset) {
      throw new BadRequestException('No destination POI catalog is available for this city');
    }
    const catalogIds = new Set(dataset.destinations.map((destination) => destination.id));
    for (const poiId of poiIds) {
      if (!catalogIds.has(poiId) && !findPoiById(poiId)) {
        throw new BadRequestException(`Unknown featured POI id: ${poiId}`);
      }
    }
  }

  private buildFeaturedPois(
    poiIds: string[],
    latitude: number | null,
    longitude: number | null,
  ): PropertyFeaturedPoiView[] {
    if (!poiIds.length) return [];
    const results: PropertyFeaturedPoiView[] = [];
    poiIds.forEach((poiId, index) => {
      const poi = findPoiById(poiId);
      if (!poi) return;
      const distanceMeters =
        latitude !== null && longitude !== null
          ? computeDistanceMeters(latitude, longitude, poi.latitude, poi.longitude)
          : 0;
      const distanceKm =
        latitude !== null && longitude !== null
          ? computeDistanceKm(latitude, longitude, poi.latitude, poi.longitude)
          : 0;
      results.push({
        id: poi.id,
        sortOrder: index + 1,
        category: poi.category,
        nameLabels: poi.nameLabels,
        latitude: poi.latitude,
        longitude: poi.longitude,
        distanceMeters,
        distanceKm,
      });
    });
    return results;
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

  /**
   * Throws 409 if the host already has a property at the same building
   * (same street + buildingNumber + coords rounded to 5 decimal places).
   */
  async assertNotDuplicateAddress(
    hostId: string,
    dto: {
      street?: string;
      buildingNumber?: string;
      latitude?: number;
      longitude?: number;
    },
    excludePropertyId?: string,
  ): Promise<void> {
    if (
      !dto.street ||
      !dto.buildingNumber ||
      dto.latitude === undefined ||
      dto.longitude === undefined
    ) {
      return;
    }
    const streetNorm = dto.street.trim().toLowerCase();
    const buildingNorm = dto.buildingNumber.trim().toLowerCase();
    const latRound = Number(dto.latitude.toFixed(5));
    const lngRound = Number(dto.longitude.toFixed(5));
    const properties = await this.prisma.property.findMany({
      where: {
        hostId,
        status: { not: 'INACTIVE' },
        ...(excludePropertyId ? { id: { not: excludePropertyId } } : {}),
      },
      select: {
        id: true,
        title: true,
        street: true,
        buildingNumber: true,
        latitude: true,
        longitude: true,
      },
    });
    for (const prop of properties) {
      if (
        prop.street?.trim().toLowerCase() === streetNorm &&
        prop.buildingNumber?.trim().toLowerCase() === buildingNorm &&
        prop.latitude !== null &&
        prop.longitude !== null &&
        Number(Number(prop.latitude).toFixed(5)) === latRound &&
        Number(Number(prop.longitude).toFixed(5)) === lngRound
      ) {
        throw new ConflictException(
          `A property at this address already exists: "${prop.title}" (id: ${prop.id})`,
        );
      }
    }
  }

  /**
   * Build the location filter. Strategy:
   *   1. House w/ coords + building number -> exact bounding box + building match.
   *   2. Coords present (any non-region kind) -> geo bounding box. Robust against
   *      locale/transliteration mismatches between query and stored address.
   *   3. No coords -> translation-aware text match across `city`/`region`,
   *      checking the top-level columns AND each locale in `addressLabels`.
   *   4. Last-resort legacy fallback for raw `city`/`country`/`region` params
   *      (used by non-geocoded callers).
   */
  private buildLocationWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    if (
      dto.searchPlaceKind === 'house' &&
      dto.searchLatitude !== undefined &&
      dto.searchLongitude !== undefined &&
      dto.searchBuildingNumber
    ) {
      return {
        buildingNumber: { equals: dto.searchBuildingNumber, mode: 'insensitive' },
        latitude: {
          gte: dto.searchLatitude - HOUSE_COORD_DELTA,
          lte: dto.searchLatitude + HOUSE_COORD_DELTA,
        },
        longitude: {
          gte: dto.searchLongitude - HOUSE_COORD_DELTA,
          lte: dto.searchLongitude + HOUSE_COORD_DELTA,
        },
      };
    }
    const geoEligible = !dto.searchPlaceKind || !GEO_INELIGIBLE_KINDS.has(dto.searchPlaceKind);
    if (geoEligible && dto.searchLatitude !== undefined && dto.searchLongitude !== undefined) {
      const radiusKm = this.resolveRadiusKm(dto.searchPlaceKind, dto.searchRadiusKm);
      const bbox = this.bboxFromRadius(dto.searchLatitude, dto.searchLongitude, radiusKm);
      return {
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      };
    }
    const textConditions: Prisma.PropertyWhereInput[] = [];
    if (dto.searchCity) {
      textConditions.push({ OR: this.localizedFieldMatches('city', dto.searchCity) });
    }
    if (dto.region) {
      textConditions.push({ OR: this.localizedFieldMatches('region', dto.region) });
    }
    const [firstCondition, ...restConditions] = textConditions;
    if (firstCondition && restConditions.length === 0) return firstCondition;
    if (firstCondition) return { AND: textConditions };
    return {
      ...(dto.city ? { city: { equals: dto.city, mode: 'insensitive' } } : {}),
      ...(dto.country ? { country: { equals: dto.country, mode: 'insensitive' } } : {}),
      ...(dto.region ? { region: { equals: dto.region, mode: 'insensitive' } } : {}),
    };
  }

  private resolveRadiusKm(kind: string | undefined, override: number | undefined): number {
    if (override !== undefined && override > 0) return override;
    if (kind && DEFAULT_RADIUS_KM_BY_KIND[kind] !== undefined) {
      return DEFAULT_RADIUS_KM_BY_KIND[kind];
    }
    return DEFAULT_RADIUS_KM;
  }

  private bboxFromRadius(
    lat: number,
    lng: number,
    radiusKm: number,
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const latDelta = radiusKm / KM_PER_DEGREE_LAT;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const safeCos = Math.max(Math.abs(cosLat), 0.0001);
    const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * safeCos);
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    };
  }

  private localizedFieldMatches(
    field: 'city' | 'region',
    value: string,
  ): Prisma.PropertyWhereInput[] {
    return [
      { [field]: { equals: value, mode: 'insensitive' } },
      ...AddressLocales.map((loc) => ({
        addressLabels: {
          path: [loc, field],
          equals: value,
        },
      })),
    ];
  }

  /**
   * Builds an OR list matching `q` against the canonical title (case-insensitive)
   * AND against every `titleLabels.<locale>` translation (substring, case-sensitive
   * due to Postgres JSON path limitations). Returns an empty array when `q` is blank.
   */
  private buildTitleSearchOr(q: string | undefined): Prisma.PropertyWhereInput[] {
    const trimmed = q?.trim();
    if (!trimmed) return [];
    return [
      { title: { contains: trimmed, mode: 'insensitive' } },
      ...AddressLocales.map((loc) => ({
        titleLabels: {
          path: [loc],
          string_contains: trimmed,
        },
      })),
    ];
  }

  /**
   * Drops empty/whitespace-only values and returns `null` when nothing remains,
   * so consumers can clear the column via Prisma's JSON null semantics.
   */
  private sanitizeTitleLabels(
    labels: { hy?: string; ru?: string; en?: string } | null | undefined,
  ): Record<string, string> | null {
    if (!labels) return null;
    const cleaned: Record<string, string> = {};
    for (const locale of AddressLocales) {
      const value = labels[locale]?.trim();
      if (value) cleaned[locale] = value;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }

  private buildTypeWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    return dto.propertyType ? { propertyType: dto.propertyType } : {};
  }

  private buildFeaturedWhere(dto: SearchPropertiesDto): Prisma.PropertyWhereInput {
    return dto.featured !== undefined ? { featured: dto.featured } : {};
  }

  private buildPriceWhere(
    dto: SearchPropertiesDto,
    priceBounds?: { minPrice?: number; maxPrice?: number },
  ): Prisma.PropertyWhereInput {
    const minPrice = priceBounds?.minPrice ?? dto.minPrice;
    const maxPrice = priceBounds?.maxPrice ?? dto.maxPrice;
    if (minPrice === undefined && maxPrice === undefined) return {};
    return {
      pricePerNight: {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      },
    };
  }

  /**
   * Listing prices use host settlement currency (USD) in minor units. Filter bounds arrive
   * in guest display currency major units, so convert to USD and scale to minor units
   * before comparing to `pricePerNight`.
   */
  private convertPriceBoundsToSettlement(
    dto: SearchPropertiesDto,
    displayCurrency: string | undefined,
    rates: CurrencyRates | null,
  ): { minPrice?: number; maxPrice?: number } {
    const settlementCurrency = 'USD';
    const minorPerMajor = 100;
    const minPrice = dto.minPrice;
    const maxPrice = dto.maxPrice;
    if (minPrice === undefined && maxPrice === undefined) return {};
    const toMinor = (major: number): number => Math.round(major * minorPerMajor);
    if (!displayCurrency || displayCurrency === settlementCurrency) {
      return {
        minPrice: minPrice === undefined ? undefined : toMinor(minPrice),
        maxPrice: maxPrice === undefined ? undefined : toMinor(maxPrice),
      };
    }
    if (!rates) {
      this.logger.warn(
        `Price filter bounds treated as ${settlementCurrency} — rates unavailable for ${displayCurrency}`,
      );
      return {
        minPrice: minPrice === undefined ? undefined : toMinor(minPrice),
        maxPrice: maxPrice === undefined ? undefined : toMinor(maxPrice),
      };
    }
    const convertBound = (amount: number): number => {
      const converted = this.currencyService.convert(
        amount,
        displayCurrency,
        settlementCurrency,
        rates,
      );
      return toMinor(converted ?? amount);
    };
    return {
      minPrice: minPrice === undefined ? undefined : convertBound(minPrice),
      maxPrice: maxPrice === undefined ? undefined : convertBound(maxPrice),
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
        ? { bathrooms: { gte: new Prisma.Decimal(dto.minBathrooms) } }
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

  private resolveSortBy(dto: SearchPropertiesDto): PropertySortValue {
    return normalizePropertySortBy(dto.sortBy) ?? 'recommended';
  }

  /**
   * Always pin featured listings first (not controllable via API sortBy).
   * Requested sort is applied only among featured, then among non-featured.
   */
  private buildOrderBy(dto: SearchPropertiesDto): Prisma.PropertyOrderByWithRelationInput[] {
    const sortBy = this.resolveSortBy(dto);
    const featuredFirst: Prisma.PropertyOrderByWithRelationInput = { featured: 'desc' };
    if (sortBy === 'priceAsc') return [featuredFirst, { pricePerNight: 'asc' }];
    if (sortBy === 'priceDesc') return [featuredFirst, { pricePerNight: 'desc' }];
    if (sortBy === 'mostReviewed') return [featuredFirst, { reviews: { _count: 'desc' } }];
    if (sortBy === 'topRated') return [featuredFirst, { createdAt: 'desc' }];
    return [featuredFirst, { createdAt: 'desc' }];
  }

  private usesAggregateReviewSort(dto: SearchPropertiesDto): boolean {
    const sortBy = this.resolveSortBy(dto);
    return sortBy === 'topRated' || sortBy === 'mostReviewed';
  }

  private usesGeoDistanceSort(dto: SearchPropertiesDto): boolean {
    if (dto.searchLatitude === undefined || dto.searchLongitude === undefined) {
      return false;
    }
    if (this.usesAggregateReviewSort(dto)) return false;
    const sortBy = this.resolveSortBy(dto);
    return sortBy === 'recommended';
  }

  private orderPropertyIdsByGeoDistance(
    properties: {
      id: string;
      featured: boolean;
      latitude: { toNumber(): number } | number | null;
      longitude: { toNumber(): number } | number | null;
    }[],
    latitude: number,
    longitude: number,
  ): string[] {
    const withCoords = properties.flatMap((property) => {
      if (property.latitude == null || property.longitude == null) return [];
      const lat =
        typeof property.latitude === 'number' ? property.latitude : property.latitude.toNumber();
      const lng =
        typeof property.longitude === 'number' ? property.longitude : property.longitude.toNumber();
      return [{ id: property.id, featured: property.featured, latitude: lat, longitude: lng }];
    });
    return withCoords
      .sort((left, right) => {
        if (left.featured !== right.featured) return left.featured ? -1 : 1;
        return (
          computeDistanceKm(latitude, longitude, left.latitude, left.longitude) -
          computeDistanceKm(latitude, longitude, right.latitude, right.longitude)
        );
      })
      .map((property) => property.id);
  }

  private async orderPropertyIdsByReviewAggregate(
    properties: { id: string; featured: boolean }[],
    sortBy: 'topRated' | 'mostReviewed',
  ): Promise<string[]> {
    if (properties.length === 0) return [];
    const propertyIds = properties.map((property) => property.id);
    const groups = await this.prisma.review.groupBy({
      by: ['propertyId'],
      where: {
        target: 'PROPERTY',
        isPublished: true,
        propertyId: { in: propertyIds },
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const byId = new Map(
      groups
        .filter((g): g is typeof g & { propertyId: string } => typeof g.propertyId === 'string')
        .map((g) => [g.propertyId, { avg: g._avg.rating ?? 0, count: g._count._all }]),
    );
    return [...properties]
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        const left = byId.get(a.id);
        const right = byId.get(b.id);
        if (sortBy === 'topRated') {
          const avgDiff = (right?.avg ?? -1) - (left?.avg ?? -1);
          if (avgDiff !== 0) return avgDiff;
          return (right?.count ?? 0) - (left?.count ?? 0);
        }
        const countDiff = (right?.count ?? 0) - (left?.count ?? 0);
        if (countDiff !== 0) return countDiff;
        return (right?.avg ?? 0) - (left?.avg ?? 0);
      })
      .map((property) => property.id);
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

  async search(
    dto: SearchPropertiesDto,
    displayCurrency?: string,
  ): Promise<
    PaginatedResponse<PropertySummary> & {
      suggestedDatesByPropertyId?: Record<string, FlexibleStayMatch>;
    }
  > {
    this.sanitizeSearchDatesInPlace(dto);
    if (this.usesFlexibleDateSearch(dto)) {
      return this.searchWithFlexibleDates(dto, displayCurrency);
    }
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    if ((dto.checkIn && !dto.checkOut) || (!dto.checkIn && dto.checkOut)) {
      throw new BadRequestException('Both checkIn and checkOut are required for date filtering');
    }
    const [unavailablePropertyIds, ratedPropertyIds, rates] = await Promise.all([
      this.getUnavailablePropertyIds(dto.checkIn, dto.checkOut),
      this.getRatedPropertyIds(dto),
      displayCurrency ? this.currencyService.getRates() : Promise.resolve(null),
    ]);
    if (ratedPropertyIds && ratedPropertyIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 1 };
    }
    const priceBounds = this.convertPriceBoundsToSettlement(dto, displayCurrency, rates);
    const where = this.buildSearchWhere(dto, unavailablePropertyIds, ratedPropertyIds, priceBounds);
    if (this.usesAggregateReviewSort(dto)) {
      const sortBy = this.resolveSortBy(dto) as 'topRated' | 'mostReviewed';
      const candidates = await this.prisma.property.findMany({
        where,
        select: { id: true, featured: true },
      });
      const orderedIds = await this.orderPropertyIdsByReviewAggregate(candidates, sortBy);
      const total = orderedIds.length;
      const pageIds = orderedIds.slice(skip, skip + limit);
      const properties = await this.prisma.property.findMany({
        where: { id: { in: pageIds } },
        include: this.searchPropertyInclude(),
      });
      const propertyById = new Map(properties.map((property) => [property.id, property]));
      const orderedProperties = pageIds
        .map((id) => propertyById.get(id))
        .filter((property): property is NonNullable<typeof property> => property !== undefined);
      const summaries = await Promise.all(
        orderedProperties.map((property) =>
          this.toPropertySummary(property, displayCurrency, rates),
        ),
      );
      return { data: summaries, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
    }
    if (this.usesGeoDistanceSort(dto)) {
      const candidates = await this.prisma.property.findMany({
        where,
        select: { id: true, featured: true, latitude: true, longitude: true },
        take: GEO_DISTANCE_CANDIDATE_CAP,
      });
      const orderedIds = this.orderPropertyIdsByGeoDistance(
        candidates,
        dto.searchLatitude as number,
        dto.searchLongitude as number,
      );
      const total = orderedIds.length;
      const pageIds = orderedIds.slice(skip, skip + limit);
      const properties = await this.prisma.property.findMany({
        where: { id: { in: pageIds } },
        include: this.searchPropertyInclude(),
      });
      const propertyById = new Map(properties.map((property) => [property.id, property]));
      const orderedProperties = pageIds
        .map((id) => propertyById.get(id))
        .filter((property): property is NonNullable<typeof property> => property !== undefined);
      const summaries = await Promise.all(
        orderedProperties.map((property) =>
          this.toPropertySummary(property, displayCurrency, rates),
        ),
      );
      return { data: summaries, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
    }
    const orderBy = this.buildOrderBy(dto);
    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: this.searchPropertyInclude(),
      }),
      this.prisma.property.count({ where }),
    ]);
    const summaries = await Promise.all(
      properties.map((property) => this.toPropertySummary(property, displayCurrency, rates)),
    );
    return { data: summaries, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  /** Past stays are never searchable: shift exact dates or clamp flexible windows to today+. */
  private sanitizeSearchDatesInPlace(dto: SearchPropertiesDto): void {
    const dates = sanitizeSearchDateFields(
      {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        stayNights: dto.stayNights,
        availableFrom: dto.availableFrom,
        availableTo: dto.availableTo,
      },
      todayIsoUtc(),
    );
    dto.checkIn = dates.checkIn;
    dto.checkOut = dates.checkOut;
    dto.stayNights = dates.stayNights;
    dto.availableFrom = dates.availableFrom;
    dto.availableTo = dates.availableTo;
  }

  private usesFlexibleDateSearch(dto: SearchPropertiesDto): boolean {
    if (dto.checkIn || dto.checkOut) {
      return false;
    }
    return (
      dto.stayNights !== undefined && Boolean(dto.availableFrom?.trim() && dto.availableTo?.trim())
    );
  }

  private validateFlexibleDateSearch(dto: SearchPropertiesDto): {
    stayNights: number;
    availableFrom: string;
    availableTo: string;
  } {
    const stayNights = dto.stayNights;
    const availableFrom = dto.availableFrom?.trim();
    const availableTo = dto.availableTo?.trim();
    if (!stayNights || stayNights < 1 || !availableFrom || !availableTo) {
      throw new BadRequestException(
        'stayNights, availableFrom, and availableTo are required for flexible date search',
      );
    }
    const fromDate = utcDateFromString(availableFrom);
    const toDate = utcDateFromString(availableTo);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid availableFrom or availableTo date');
    }
    if (toDate < fromDate) {
      throw new BadRequestException('availableTo must be on or after availableFrom');
    }
    if (diffDaysInclusive(fromDate, toDate) > MAX_FLEXIBLE_WINDOW_DAYS) {
      throw new BadRequestException(
        `Flexible date window cannot exceed ${MAX_FLEXIBLE_WINDOW_DAYS} days`,
      );
    }
    return { stayNights, availableFrom, availableTo };
  }

  private async searchWithFlexibleDates(
    dto: SearchPropertiesDto,
    displayCurrency?: string,
  ): Promise<
    PaginatedResponse<PropertySummary> & {
      suggestedDatesByPropertyId: Record<string, FlexibleStayMatch>;
    }
  > {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const { stayNights, availableFrom, availableTo } = this.validateFlexibleDateSearch(dto);
    const [ratedPropertyIds, rates] = await Promise.all([
      this.getRatedPropertyIds(dto),
      displayCurrency ? this.currencyService.getRates() : Promise.resolve(null),
    ]);
    if (ratedPropertyIds && ratedPropertyIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 1, suggestedDatesByPropertyId: {} };
    }
    const priceBounds = this.convertPriceBoundsToSettlement(dto, displayCurrency, rates);
    const where = this.buildSearchWhere(dto, [], ratedPropertyIds, priceBounds);
    const orderBy = this.buildOrderBy(dto);
    const candidates = await this.prisma.property.findMany({
      where,
      orderBy: this.usesGeoDistanceSort(dto) ? undefined : orderBy,
      take: FLEXIBLE_SEARCH_CANDIDATE_CAP,
      select: { id: true, featured: true, latitude: true, longitude: true },
    });
    let candidateIds = candidates.map((row) => row.id);
    if (this.usesAggregateReviewSort(dto)) {
      const sortBy = this.resolveSortBy(dto) as 'topRated' | 'mostReviewed';
      candidateIds = await this.orderPropertyIdsByReviewAggregate(candidates, sortBy);
    } else if (this.usesGeoDistanceSort(dto)) {
      candidateIds = this.orderPropertyIdsByGeoDistance(
        candidates,
        dto.searchLatitude as number,
        dto.searchLongitude as number,
      );
    }
    const flexibleMatches = await this.findFlexibleAvailabilityForProperties(
      candidateIds,
      availableFrom,
      availableTo,
      stayNights,
    );
    const availableIds = candidateIds.filter((id) => flexibleMatches.has(id));
    const total = availableIds.length;
    if (total === 0) {
      return { data: [], total: 0, page, limit, totalPages: 1, suggestedDatesByPropertyId: {} };
    }
    const skip = (page - 1) * limit;
    const pageIds = availableIds.slice(skip, skip + limit);
    const properties = await this.prisma.property.findMany({
      where: { id: { in: pageIds } },
      include: this.searchPropertyInclude(),
    });
    const propertyById = new Map(properties.map((property) => [property.id, property]));
    const orderedProperties = pageIds
      .map((id) => propertyById.get(id))
      .filter((property): property is NonNullable<typeof property> => property !== undefined);
    const summaries = await Promise.all(
      orderedProperties.map((property) => this.toPropertySummary(property, displayCurrency, rates)),
    );
    const suggestedDatesByPropertyId: Record<string, FlexibleStayMatch> = {};
    for (const id of pageIds) {
      const match = flexibleMatches.get(id);
      if (match) {
        suggestedDatesByPropertyId[id] = match;
      }
    }
    return {
      data: summaries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      suggestedDatesByPropertyId,
    };
  }

  private searchPropertyInclude(): {
    photos: {
      orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }];
      take: number;
    };
    _count: { select: { reviews: { where: { isPublished: true; target: 'PROPERTY' } } } };
    reviews: { where: { isPublished: true; target: 'PROPERTY' }; select: { rating: true } };
  } {
    return {
      photos: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 5 },
      _count: { select: { reviews: { where: { isPublished: true, target: 'PROPERTY' } } } },
      reviews: {
        where: { isPublished: true, target: 'PROPERTY' },
        select: { rating: true },
      },
    };
  }

  private buildSearchWhere(
    dto: SearchPropertiesDto,
    unavailablePropertyIds: string[],
    ratedPropertyIds: string[] | null,
    priceBounds?: { minPrice?: number; maxPrice?: number },
  ): Prisma.PropertyWhereInput {
    const titleSearchOr = this.buildTitleSearchOr(dto.q);
    const andClauses: Prisma.PropertyWhereInput[] = [
      this.buildBaseWhere(),
      this.buildLocationWhere(dto),
      this.buildTypeWhere(dto),
      this.buildFeaturedWhere(dto),
      this.buildPriceWhere(dto, priceBounds),
      this.buildFeesWhere(dto),
      this.buildCapacityWhere(dto),
      this.buildRoomsWhere(dto),
      this.buildStayRulesWhere(dto),
      this.buildHouseRulesWhere(dto),
      ...this.buildAmenitiesAndWhere(dto),
      ...(titleSearchOr.length > 0 ? [{ OR: titleSearchOr }] : []),
      ...(unavailablePropertyIds.length > 0 ? [{ id: { notIn: unavailablePropertyIds } }] : []),
      ...(ratedPropertyIds ? [{ id: { in: ratedPropertyIds } }] : []),
    ].filter((w) => Object.keys(w).length > 0);
    return { AND: andClauses };
  }

  private async findFlexibleAvailabilityForProperties(
    propertyIds: string[],
    availableFrom: string,
    availableTo: string,
    stayNights: number,
  ): Promise<Map<string, FlexibleStayMatch>> {
    if (propertyIds.length === 0) {
      return new Map();
    }
    const fromDate = utcDateFromString(availableFrom);
    const lastCheckInDate = utcDateFromString(availableTo);
    const scanEndDate = addDays(lastCheckInDate, stayNights);
    const [bookings, closedAvailability] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: { in: [...BLOCKING_BOOKING_STATUSES] },
          checkIn: { lt: scanEndDate },
          checkOut: { gt: fromDate },
        },
        select: { propertyId: true, checkIn: true, checkOut: true },
      }),
      this.prisma.availability.findMany({
        where: {
          propertyId: { in: propertyIds },
          isAvailable: false,
          date: { gte: fromDate, lt: scanEndDate },
        },
        select: { propertyId: true, date: true },
      }),
    ]);
    const bookingsByProperty = new Map<string, Array<{ checkIn: Date; checkOut: Date }>>();
    for (const booking of bookings) {
      const rows = bookingsByProperty.get(booking.propertyId) ?? [];
      rows.push({ checkIn: booking.checkIn, checkOut: booking.checkOut });
      bookingsByProperty.set(booking.propertyId, rows);
    }
    const closedByProperty = new Map<string, Array<{ date: Date }>>();
    for (const row of closedAvailability) {
      const rows = closedByProperty.get(row.propertyId) ?? [];
      rows.push({ date: row.date });
      closedByProperty.set(row.propertyId, rows);
    }
    const matches = new Map<string, FlexibleStayMatch>();
    for (const propertyId of propertyIds) {
      const blocked = buildBlockedDatesForProperty(
        bookingsByProperty.get(propertyId) ?? [],
        closedByProperty.get(propertyId) ?? [],
        fromDate,
        scanEndDate,
      );
      const match = findFirstFlexibleStaySlot(blocked, availableFrom, availableTo, stayNights);
      if (match) {
        matches.set(propertyId, match);
      }
    }
    return matches;
  }

  async findById(
    id: string,
    requestingUserId?: string,
    displayCurrency?: string,
  ): Promise<PropertyDetail> {
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
    const {
      addressLabels: rawAddressLabels,
      titleLabels: rawTitleLabels,
      ...propertyRest
    } = property;
    const latitude = property.latitude !== null ? Number(property.latitude) : null;
    const longitude = property.longitude !== null ? Number(property.longitude) : null;
    const rates = displayCurrency ? await this.currencyService.getRates() : null;
    return {
      ...propertyRest,
      photos,
      host,
      avgRating,
      reviewCount,
      addressLabels: this.parseAddressLabels(rawAddressLabels),
      titleLabels: this.parseTitleLabels(rawTitleLabels),
      featuredPois: this.buildFeaturedPois(property.featuredPoiIds, latitude, longitude),
      displayPrice: this.buildDisplayPrice(
        property.pricePerNight,
        property.currency,
        displayCurrency,
        rates,
      ),
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
          ],
        }
      : {};
    const where: Prisma.PropertyWhereInput = {
      hostId: hostProfile.id,
      ...statusWhere,
      ...typeWhere,
      ...searchWhere,
    };
    const todayUtc = startOfTodayUtc();
    const [
      properties,
      total,
      totalListings,
      activeListings,
      upcomingReservations,
      pastReservations,
      earningsAgg,
    ] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          photos: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          _count: { select: { reviews: { where: { isPublished: true, target: 'PROPERTY' } } } },
          reviews: {
            where: { isPublished: true, target: 'PROPERTY' },
            select: { rating: true },
          },
        },
      }),
      this.prisma.property.count({ where }),
      this.prisma.property.count({
        where: { hostId: hostProfile.id, status: { not: 'INACTIVE' } },
      }),
      this.prisma.property.count({ where: { hostId: hostProfile.id, status: 'ACTIVE' } }),
      this.prisma.booking.count({
        where: {
          property: { hostId: hostProfile.id },
          status: 'CONFIRMED',
          checkOut: { gte: todayUtc },
        },
      }),
      this.prisma.booking.count({
        where: {
          property: { hostId: hostProfile.id },
          OR: [{ status: 'COMPLETED' }, { status: 'CONFIRMED', checkOut: { lt: todayUtc } }],
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          property: { hostId: hostProfile.id },
          payoutStatus: 'PAID',
        },
        _sum: { hostPayoutAmount: true },
      }),
    ]);
    const propertyIds = properties.map((property) => property.id);
    const earningsByPropertyId = await this.getPaidEarningsByPropertyId(propertyIds);
    const data = await Promise.all(
      properties.map((property) =>
        this.toHostListingSummary(property, earningsByPropertyId.get(property.id) ?? 0),
      ),
    );
    const stats: HostDashboardStats = {
      totalListings,
      activeListings,
      pendingRequests: 0,
      upcomingReservations,
      pastReservations,
      totalEarnings: earningsAgg._sum.hostPayoutAmount ?? 0,
    };
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1, stats };
  }

  async update(id: string, hostUserId: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await this.getOwnedProperty(id, hostUserId);
    if (dto.featuredPoiIds !== undefined) {
      this.validateFeaturedPoiIds(
        dto.featuredPoiIds,
        dto.city ?? property.city,
        dto.region ?? property.region,
      );
    }
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
    const latitude =
      dto.latitude ?? (property.latitude !== null ? Number(property.latitude) : undefined);
    const longitude =
      dto.longitude ?? (property.longitude !== null ? Number(property.longitude) : undefined);
    const addressLabels =
      hasAddressUpdate && latitude !== undefined && longitude !== undefined
        ? await this.geocoding.resolveAddressLabels(latitude, longitude)
        : undefined;
    const data: Prisma.PropertyUpdateInput = {
      ...dto,
      bathrooms: dto.bathrooms !== undefined ? new Prisma.Decimal(dto.bathrooms) : undefined,
      latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined,
      longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : undefined,
      addressLabels: addressLabels as unknown as Prisma.InputJsonValue | undefined,
    };
    if (dto.titleLabels !== undefined) {
      data.titleLabels = this.sanitizeTitleLabels(
        dto.titleLabels,
      ) as unknown as Prisma.InputJsonValue;
    }
    if (dto.guestInstructions !== undefined) {
      data.guestInstructions = sanitizeGuestInstructionsHtml(dto.guestInstructions) ?? null;
    }
    if (dto.title && dto.title !== property.title) {
      data.slug = await this.generateUniqueSlug(dto.title, property.id);
    }
    const nextPolicy = dto.cancellationPolicy ?? property.cancellationPolicy;
    const nextPrice = dto.pricePerNight ?? property.pricePerNight;
    const feeTouched =
      dto.cancellationPolicy !== undefined ||
      dto.cancellationFeeType !== undefined ||
      dto.cancellationFeeValue !== undefined ||
      dto.pricePerNight !== undefined;
    if (feeTouched) {
      const resolved = resolveCancellationFeeFields({
        cancellationPolicy: nextPolicy,
        cancellationFeeType: dto.cancellationFeeType ?? property.cancellationFeeType,
        cancellationFeeValue: dto.cancellationFeeValue ?? property.cancellationFeeValue,
        pricePerNight: nextPrice,
      });
      data.cancellationFeeType = resolved.cancellationFeeType;
      data.cancellationFeeValue = resolved.cancellationFeeValue;
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

  private resolveFavoriteCityFilter(dto: { city?: string; cities?: string[] }): string[] {
    if (dto.cities && dto.cities.length > 0) {
      return expandCityFilterValues(dto.cities);
    }
    if (dto.city) {
      return expandCityFilterValues([dto.city]);
    }
    return [];
  }

  private resolveFavoriteRegionFilter(dto: { region?: string; regions?: string[] }): string[] {
    if (dto.regions && dto.regions.length > 0) {
      return [...dto.regions];
    }
    if (dto.region) {
      return [dto.region];
    }
    return [];
  }

  buildFavoritesPropertyWhere(dto: {
    q?: string;
    city?: string;
    cities?: string[];
    country?: string;
    region?: string;
    regions?: string[];
    propertyType?: SearchPropertiesDto['propertyType'];
    minPrice?: number;
    maxPrice?: number;
    maxGuests?: number;
    minBedrooms?: number;
    minBeds?: number;
    minBathrooms?: number;
  }): Prisma.PropertyWhereInput {
    const titleSearchOr = this.buildTitleSearchOr(dto.q);
    const searchSlice = dto as SearchPropertiesDto;
    const cityValues = this.resolveFavoriteCityFilter(dto);
    const regionValues = this.resolveFavoriteRegionFilter(dto);
    const andClauses: Prisma.PropertyWhereInput[] = [
      this.buildBaseWhere(),
      {
        ...(cityValues.length > 0
          ? { city: { in: cityValues, mode: 'insensitive' as const } }
          : {}),
        ...(dto.country ? { country: { equals: dto.country, mode: 'insensitive' as const } } : {}),
        ...(regionValues.length > 0
          ? { region: { in: regionValues, mode: 'insensitive' as const } }
          : {}),
      },
      this.buildTypeWhere(searchSlice),
      this.buildPriceWhere(searchSlice),
      this.buildCapacityWhere(searchSlice),
      this.buildRoomsWhere(searchSlice),
      ...(titleSearchOr.length > 0 ? [{ OR: titleSearchOr }] : []),
    ].filter((w) => Object.keys(w).length > 0);
    return { AND: andClauses };
  }

  async toPropertySummary(
    property: Property & {
      photos: PropertyPhoto[];
      reviews: { rating: number }[];
      _count: { reviews: number };
    },
    displayCurrency?: string,
    rates?: CurrencyRates | null,
  ): Promise<PropertySummary> {
    const photoUrls = (
      await Promise.all(
        property.photos.slice(0, 5).map(async (photo) => this.safePresignedUrl(photo.key)),
      )
    ).filter((url): url is string => Boolean(url));
    const coverPhotoUrl = photoUrls[0];
    const reviewCount = property._count.reviews;
    const avgRating =
      property.reviews.length > 0
        ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
        : undefined;
    return {
      id: property.id,
      title: property.title,
      titleLabels: this.parseTitleLabels(property.titleLabels),
      slug: property.slug,
      propertyType: property.propertyType,
      city: property.city,
      region: property.region,
      country: property.country,
      pricePerNight: property.pricePerNight,
      currency: property.currency,
      displayPrice: this.buildDisplayPrice(
        property.pricePerNight,
        property.currency,
        displayCurrency,
        rates ?? null,
      ),
      coverPhotoUrl,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      avgRating,
      reviewCount,
      featured: property.featured,
      addressLabels: this.parseAddressLabels(property.addressLabels),
    };
  }

  private parseAddressLabels(value: unknown): PropertyAddressLabels | null {
    if (!value || typeof value !== 'object') return null;
    return value as PropertyAddressLabels;
  }

  private parseTitleLabels(value: unknown): PropertyTitleLabels | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as PropertyTitleLabels;
  }

  private async getPaidEarningsByPropertyId(propertyIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (propertyIds.length === 0) return result;
    const groups = await this.prisma.booking.groupBy({
      by: ['propertyId'],
      where: { propertyId: { in: propertyIds }, payoutStatus: 'PAID' },
      _sum: { hostPayoutAmount: true },
    });
    for (const group of groups) {
      result.set(group.propertyId, group._sum.hostPayoutAmount ?? 0);
    }
    return result;
  }

  private async toHostListingSummary(
    property: Property & {
      photos: PropertyPhoto[];
      reviews: { rating: number }[];
      _count: { reviews: number };
    },
    totalEarnings: number,
  ): Promise<HostListingSummary> {
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
      titleLabels: this.parseTitleLabels(property.titleLabels),
      status: property.status as import('@repo/shared').PropertyStatus,
      propertyType: property.propertyType as import('@repo/shared').PropertyType,
      city: property.city,
      region: property.region,
      pricePerNight: property.pricePerNight,
      currency: property.currency,
      coverPhotoUrl,
      bedrooms: property.bedrooms,
      maxGuests: property.maxGuests,
      avgRating,
      reviewCount,
      totalEarnings,
    };
  }
}

function resolveCancellationFeeFields(input: {
  cancellationPolicy: string;
  cancellationFeeType?: CancellationFeeType | null;
  cancellationFeeValue?: number | null;
  pricePerNight: number;
}): { cancellationFeeType: CancellationFeeType; cancellationFeeValue: number } {
  if (input.cancellationPolicy === 'NON_REFUNDABLE') {
    return { cancellationFeeType: 'PERCENT', cancellationFeeValue: 100 };
  }
  const feeType: CancellationFeeType = input.cancellationFeeType ?? 'PERCENT';
  const feeValue = input.cancellationFeeValue ?? 0;
  if (feeType === 'PERCENT') {
    if (feeValue > MAX_CANCELLATION_FEE_PERCENT) {
      throw new BadRequestException(
        `cancellationFeeValue must be at most ${MAX_CANCELLATION_FEE_PERCENT} when fee type is PERCENT`,
      );
    }
    return { cancellationFeeType: 'PERCENT', cancellationFeeValue: feeValue };
  }
  if (feeValue > input.pricePerNight) {
    throw new BadRequestException(
      'cancellationFeeValue must not exceed pricePerNight when fee type is FIXED',
    );
  }
  return { cancellationFeeType: 'FIXED', cancellationFeeValue: feeValue };
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
