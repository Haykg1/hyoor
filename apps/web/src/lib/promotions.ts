import type { PromotionDiscountType, PromotionType } from '@repo/shared';

const MINOR_UNIT_DIVISOR = 100;

export interface SmartPromotionDescriptionInput {
  discountType: PromotionDiscountType;
  discountPercent?: number;
  discountAmount?: number;
  currency: string;
  type: PromotionType;
  bookingStartDate: string;
  bookingEndDate: string;
  promoCode?: string;
  maxApplications: number;
  appliedCount?: number;
}

function formatDiscount(input: SmartPromotionDescriptionInput): string {
  if (input.discountType === 'PERCENT' && input.discountPercent !== undefined) {
    return `${input.discountPercent}% off`;
  }
  if (input.discountType === 'FIXED_AMOUNT' && input.discountAmount !== undefined) {
    const major = input.discountAmount / MINOR_UNIT_DIVISOR;
    return `${major} ${input.currency} off`;
  }
  return 'Special discount';
}

function formatDateRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

export function buildSmartPromotionDescription(input: SmartPromotionDescriptionInput): string {
  const discount = formatDiscount(input);
  const bookingRange = formatDateRange(input.bookingStartDate, input.bookingEndDate);
  const applied = input.appliedCount ?? 0;
  const remaining = Math.max(0, input.maxApplications - applied);
  if (input.type === 'PROMO_CODE' && input.promoCode) {
    return `${discount} with code ${input.promoCode.toUpperCase()} for stays ${bookingRange}. ${remaining} uses left (${applied} applied).`;
  }
  return `${discount} for stays booked ${bookingRange}. Valid for ${remaining} future bookings in this period (${applied} already applied).`;
}
