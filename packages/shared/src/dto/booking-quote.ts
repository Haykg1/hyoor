import type { PromotionDiscountType, PromotionType } from './promotions';

export interface BookingQuoteInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  promoCode?: string;
}

export interface AppliedPromotionSummary {
  id: string;
  type: PromotionType;
  description: string;
  promoCode: string | null;
  discountType: PromotionDiscountType;
  discountPercent: number | null;
  discountAmount: number | null;
}

export interface BookingQuoteResult {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  currency: string;
  nightsCount: number;
  nightlyRate: number;
  accommodationSubtotal: number;
  discountAmount: number;
  discountedAccommodation: number;
  cleaningFee: number;
  securityDeposit: number;
  totalAmount: number;
  appliedPromotion: AppliedPromotionSummary | null;
  promoCodeError?: string;
}

export interface BookingPromotionSummary {
  id: string;
  type: PromotionType;
  description: string;
  promoCode: string | null;
  discountType: PromotionDiscountType;
  discountPercent: number | null;
  discountAmount: number | null;
}
