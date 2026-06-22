import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PropertyPromotion } from '@repo/database/client';
import type {
  AppliedPromotionSummary,
  CreatePromotionResult,
  HotDealProperty,
  PaginatedResponse,
  PromotionSummary,
} from '@repo/shared';
import { DEFAULT_PAGE_SIZE, S3_PRESIGNED_URL_EXPIRES } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { HostProfilesService } from '../host-profiles/host-profiles.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

import type { CreatePromotionDto } from './dto/create-promotion.dto';
import type { QueryPromotionsDto } from './dto/query-promotions.dto';

export interface ResolveBestPromotionInput {
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
  promoCode?: string;
  accommodationSubtotal: number;
}

export interface ResolvedPromotion {
  promotion: PropertyPromotion | null;
  discountAmount: number;
  promoCodeError?: string;
}

type PromotionWithProperty = PropertyPromotion & {
  property: {
    title: string;
    currency: string;
    city: string;
    country: string;
    formattedAddress: string | null;
    addressLine: string | null;
  };
};

const HOT_DEAL_WINDOW_HOURS = 72;
const HOT_DEAL_LIMIT = 10;

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hostProfilesService: HostProfilesService,
    private readonly notificationsService: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  async create(hostUserId: string, dto: CreatePromotionDto): Promise<CreatePromotionResult> {
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: {
        id: true,
        hostId: true,
        status: true,
        title: true,
        currency: true,
        city: true,
        country: true,
        formattedAddress: true,
        addressLine: true,
      },
    });
    if (!property || property.hostId !== hostProfile.id) {
      throw new ForbiddenException('You do not own this property');
    }
    if (property.status !== 'ACTIVE') {
      throw new BadRequestException('Promotions can only be created for active listings');
    }
    const bookingStartDate = this.parseDateOnly(dto.bookingStartDate);
    const bookingEndDate = this.parseDateOnly(dto.bookingEndDate);
    if (bookingEndDate < bookingStartDate) {
      throw new BadRequestException('Booking end date must be on or after start date');
    }
    this.validateDiscount(dto);
    if (dto.type === 'PROMO_CODE' && !dto.promoCode) {
      throw new BadRequestException('Promo code is required for promo code promotions');
    }
    if (dto.type === 'DATE_RANGE' && dto.promoCode) {
      throw new BadRequestException('Promo code must not be set for date range promotions');
    }
    const normalizedPromoCode =
      dto.type === 'PROMO_CODE' ? dto.promoCode!.trim().toUpperCase() : null;
    if (normalizedPromoCode) {
      const existing = await this.prisma.propertyPromotion.findFirst({
        where: { propertyId: dto.propertyId, promoCode: normalizedPromoCode, isActive: true },
      });
      if (existing) {
        throw new ConflictException('This promo code is already active for the property');
      }
    }
    const promotion = await this.prisma.propertyPromotion.create({
      data: {
        propertyId: dto.propertyId,
        type: dto.type,
        discountType: dto.discountType,
        discountPercent: dto.discountType === 'PERCENT' ? dto.discountPercent : null,
        discountAmount: dto.discountType === 'FIXED_AMOUNT' ? dto.discountAmount : null,
        description: dto.description.trim(),
        bookingStartDate,
        bookingEndDate,
        promoCode: normalizedPromoCode,
        maxApplications: dto.maxApplications,
        notifyGuests: dto.notifyGuests,
      },
      include: {
        property: {
          select: {
            title: true,
            currency: true,
            city: true,
            country: true,
            formattedAddress: true,
            addressLine: true,
          },
        },
      },
    });
    let guestsNotified = 0;
    if (dto.notifyGuests) {
      guestsNotified = await this.notifyFavoritingGuests(
        dto.propertyId,
        promotion as PromotionWithProperty,
      );
    }
    return {
      promotion: this.toSummary(promotion as PromotionWithProperty),
      guestsNotified,
    };
  }

  async remove(hostUserId: string, promotionId: string): Promise<void> {
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    const promotion = await this.prisma.propertyPromotion.findUnique({
      where: { id: promotionId },
      select: { id: true, property: { select: { hostId: true } } },
    });
    if (!promotion || promotion.property.hostId !== hostProfile.id) {
      throw new NotFoundException('Promotion not found');
    }
    await this.prisma.propertyPromotion.delete({ where: { id: promotionId } });
  }

  async findByHost(
    hostUserId: string,
    dto: QueryPromotionsDto,
  ): Promise<PaginatedResponse<PromotionSummary>> {
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const where = {
      property: { hostId: hostProfile.id },
      ...(dto.propertyId ? { propertyId: dto.propertyId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.propertyPromotion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          property: {
            select: {
              title: true,
              currency: true,
              city: true,
              country: true,
              formattedAddress: true,
              addressLine: true,
            },
          },
        },
      }),
      this.prisma.propertyPromotion.count({ where }),
    ]);
    return {
      data: rows.map((row) => this.toSummary(row as PromotionWithProperty)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findEligibleDateRangePromotions(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<PropertyPromotion[]> {
    const rows = await this.prisma.propertyPromotion.findMany({
      where: {
        propertyId,
        type: 'DATE_RANGE',
        isActive: true,
        bookingStartDate: { lte: checkOut },
        bookingEndDate: { gte: checkIn },
      },
    });
    return rows.filter((row) => row.appliedCount < row.maxApplications);
  }

  async findEligiblePromoCodePromotion(
    propertyId: string,
    promoCode: string,
  ): Promise<PropertyPromotion | null> {
    const normalized = promoCode.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    const row = await this.prisma.propertyPromotion.findFirst({
      where: {
        propertyId,
        type: 'PROMO_CODE',
        isActive: true,
        promoCode: normalized,
      },
    });
    if (!row || row.appliedCount >= row.maxApplications) {
      return null;
    }
    return row;
  }

  calculateDiscountAmount(promotion: PropertyPromotion, accommodationSubtotal: number): number {
    if (accommodationSubtotal <= 0) {
      return 0;
    }
    let discount = 0;
    if (promotion.discountType === 'PERCENT' && promotion.discountPercent !== null) {
      discount = Math.round((accommodationSubtotal * promotion.discountPercent) / 100);
    } else if (promotion.discountType === 'FIXED_AMOUNT' && promotion.discountAmount !== null) {
      discount = promotion.discountAmount;
    }
    return Math.min(discount, accommodationSubtotal);
  }

  pickBestPromotion(
    candidates: PropertyPromotion[],
    accommodationSubtotal: number,
  ): { promotion: PropertyPromotion | null; discountAmount: number } {
    let bestPromotion: PropertyPromotion | null = null;
    let bestDiscount = 0;
    for (const candidate of candidates) {
      const discount = this.calculateDiscountAmount(candidate, accommodationSubtotal);
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestPromotion = candidate;
      }
    }
    return { promotion: bestPromotion, discountAmount: bestDiscount };
  }

  async resolveBestPromotion(input: ResolveBestPromotionInput): Promise<ResolvedPromotion> {
    const dateRangePromos = await this.findEligibleDateRangePromotions(
      input.propertyId,
      input.checkIn,
      input.checkOut,
    );
    const candidates = [...dateRangePromos];
    let promoCodeError: string | undefined;
    if (input.promoCode?.trim()) {
      const codePromo = await this.findEligiblePromoCodePromotion(
        input.propertyId,
        input.promoCode,
      );
      if (codePromo) {
        candidates.push(codePromo);
      } else {
        promoCodeError = 'Invalid or expired promo code';
      }
    }
    const { promotion, discountAmount } = this.pickBestPromotion(
      candidates,
      input.accommodationSubtotal,
    );
    return { promotion, discountAmount, promoCodeError };
  }

  async assertPromotionSlotAvailable(promotionId: string): Promise<void> {
    const promotion = await this.prisma.propertyPromotion.findUnique({
      where: { id: promotionId },
    });
    if (!promotion || !promotion.isActive) {
      throw new ConflictException('Promotion is no longer available');
    }
    if (promotion.appliedCount >= promotion.maxApplications) {
      throw new ConflictException('Promotion has reached its maximum number of applications');
    }
  }

  async incrementAppliedCount(promotionId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.propertyPromotion.update({
      where: { id: promotionId },
      data: { appliedCount: { increment: 1 } },
    });
  }

  async decrementAppliedCount(promotionId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    const promotion = await client.propertyPromotion.findUnique({
      where: { id: promotionId },
      select: { appliedCount: true },
    });
    if (!promotion || promotion.appliedCount <= 0) {
      return;
    }
    await client.propertyPromotion.update({
      where: { id: promotionId },
      data: { appliedCount: { decrement: 1 } },
    });
  }

  toAppliedPromotionSummary(promotion: PropertyPromotion): AppliedPromotionSummary {
    return {
      id: promotion.id,
      type: promotion.type,
      description: promotion.description,
      promoCode: promotion.promoCode,
      discountType: promotion.discountType,
      discountPercent: promotion.discountPercent,
      discountAmount: promotion.discountAmount,
    };
  }

  private async notifyFavoritingGuests(
    propertyId: string,
    promotion: PromotionWithProperty,
  ): Promise<number> {
    const favorites = await this.prisma.propertyFavorite.findMany({
      where: { propertyId },
      select: { userId: true },
    });
    if (favorites.length === 0) {
      return 0;
    }
    const address =
      promotion.property.formattedAddress ??
      promotion.property.addressLine ??
      `${promotion.property.city}, ${promotion.property.country}`;
    const title = `Deal: ${promotion.property.title}`;
    const body = `${promotion.description}\n${address}`;
    await Promise.all(
      favorites.map((favorite) =>
        this.notificationsService.notifyCustom(
          favorite.userId,
          'PROPERTY_PROMOTION',
          title,
          body,
          promotion.id,
          'promotion',
        ),
      ),
    );
    return favorites.length;
  }

  async getHotDeals(): Promise<HotDealProperty[]> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + HOT_DEAL_WINDOW_HOURS * 60 * 60 * 1000);
    const promotions = await this.prisma.propertyPromotion.findMany({
      where: {
        isActive: true,
        type: 'DATE_RANGE',
        bookingStartDate: { lte: windowEnd },
        bookingEndDate: { gte: now, lte: windowEnd },
        property: { status: 'ACTIVE' },
      },
      orderBy: { bookingEndDate: 'asc' },
      take: HOT_DEAL_LIMIT,
      include: {
        property: {
          include: {
            photos: { where: { isCover: true }, take: 1 },
            reviews: {
              where: { isPublished: true, target: 'PROPERTY' },
              select: { rating: true },
            },
            _count: {
              select: { reviews: { where: { isPublished: true, target: 'PROPERTY' } } },
            },
          },
        },
      },
    });
    return Promise.all(
      promotions.map(async (promo) => {
        const p = promo.property;
        const coverPhoto = p.photos[0];
        let coverPhotoUrl: string | undefined;
        if (coverPhoto) {
          try {
            coverPhotoUrl = await this.storage.getPresignedUrl(
              coverPhoto.key,
              S3_PRESIGNED_URL_EXPIRES,
            );
          } catch {
            coverPhotoUrl = undefined;
          }
        }
        const avgRating =
          p.reviews.length > 0
            ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
            : undefined;
        return {
          id: p.id,
          title: p.title,
          titleLabels: p.titleLabels as HotDealProperty['titleLabels'],
          slug: p.slug,
          propertyType: p.propertyType,
          city: p.city,
          region: p.region,
          country: p.country,
          pricePerNight: p.pricePerNight,
          currency: p.currency,
          coverPhotoUrl,
          maxGuests: p.maxGuests,
          bedrooms: p.bedrooms,
          avgRating,
          reviewCount: p._count.reviews,
          featured: p.featured,
          addressLabels: p.addressLabels as HotDealProperty['addressLabels'],
          promotionId: promo.id,
          discountType: promo.discountType,
          discountPercent: promo.discountPercent,
          discountAmount: promo.discountAmount,
          promotionDescription: promo.description,
          bookingEndDate: promo.bookingEndDate.toISOString().slice(0, 10),
        } satisfies HotDealProperty;
      }),
    );
  }

  private validateDiscount(dto: CreatePromotionDto): void {
    if (dto.discountType === 'PERCENT') {
      if (dto.discountPercent === undefined) {
        throw new BadRequestException('Discount percent is required');
      }
      return;
    }
    if (dto.discountAmount === undefined) {
      throw new BadRequestException('Discount amount is required');
    }
  }

  private parseDateOnly(isoDate: string): Date {
    const parsed = new Date(`${isoDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return parsed;
  }

  private toSummary(row: PromotionWithProperty): PromotionSummary {
    const remaining = Math.max(0, row.maxApplications - row.appliedCount);
    return {
      id: row.id,
      propertyId: row.propertyId,
      propertyTitle: row.property.title,
      type: row.type,
      discountType: row.discountType,
      discountPercent: row.discountPercent,
      discountAmount: row.discountAmount,
      currency: row.property.currency,
      description: row.description,
      bookingStartDate: row.bookingStartDate.toISOString().slice(0, 10),
      bookingEndDate: row.bookingEndDate.toISOString().slice(0, 10),
      promoCode: row.promoCode,
      maxApplications: row.maxApplications,
      appliedCount: row.appliedCount,
      remainingApplications: remaining,
      notifyGuests: row.notifyGuests,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
