export const PROMOTION_TYPES = ['DATE_RANGE', 'PROMO_CODE'] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PROMOTION_DISCOUNT_TYPES = ['PERCENT', 'FIXED_AMOUNT'] as const;
export type PromotionDiscountType = (typeof PROMOTION_DISCOUNT_TYPES)[number];

export interface CreatePromotionInput {
  propertyId: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountPercent?: number;
  discountAmount?: number;
  description: string;
  bookingStartDate: string;
  bookingEndDate: string;
  promoCode?: string;
  maxApplications: number;
  notifyGuests: boolean;
}

export interface PromotionSummary {
  id: string;
  propertyId: string;
  propertyTitle: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountPercent: number | null;
  discountAmount: number | null;
  currency: string;
  description: string;
  bookingStartDate: string;
  bookingEndDate: string;
  promoCode: string | null;
  maxApplications: number;
  appliedCount: number;
  remainingApplications: number;
  notifyGuests: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePromotionResult {
  promotion: PromotionSummary;
  guestsNotified: number;
}

/** A property with an active time-limited discount expiring within 72 hours. */
export interface HotDealProperty {
  id: string;
  title: string;
  titleLabels?: import('../dto/geocoding').PropertyTitleLabels | null;
  slug: string;
  propertyType: string;
  city: string;
  region: string | null;
  country: string;
  pricePerNight: number;
  currency: string;
  coverPhotoUrl?: string;
  maxGuests: number;
  bedrooms: number;
  avgRating?: number;
  reviewCount: number;
  featured: boolean;
  addressLabels?: import('../dto/geocoding').PropertyAddressLabels | null;
  /** Promotion details */
  promotionId: string;
  discountType: PromotionDiscountType;
  discountPercent: number | null;
  discountAmount: number | null;
  promotionDescription: string;
  bookingEndDate: string;
}

export interface ListPromotionsQuery {
  propertyId?: string;
  page?: number;
  limit?: number;
}
