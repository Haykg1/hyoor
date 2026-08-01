import type { BookingDetail, CancellationFeeType } from '@repo/shared';
import { canGuestCancelStay, computeCancellationFee } from '@repo/shared';

const CANCELLABLE_STATUSES = new Set(['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED']);

export interface CancelBookingPreview {
  id: string;
  status: string;
  checkIn: string;
  totalAmount: number;
  securityDeposit: number;
  currency: string;
  cancellationPolicy: string;
  cancellationFeeType: CancellationFeeType;
  cancellationFeeValue: number;
  cancellationDeadlineDays: number;
}

export function rentAmountFromBooking(booking: {
  totalAmount: number;
  securityDeposit: number;
}): number {
  return Math.max(0, booking.totalAmount - booking.securityDeposit);
}

export function isBookingCancellable(booking: { status: string; checkIn: string }): boolean {
  if (!CANCELLABLE_STATUSES.has(booking.status)) {
    return false;
  }
  return new Date(booking.checkIn) > new Date();
}

export function canGuestCancelBooking(booking: CancelBookingPreview): boolean {
  return (
    isBookingCancellable(booking) &&
    canGuestCancelStay({
      cancellationPolicy: booking.cancellationPolicy,
      checkIn: booking.checkIn,
      cancellationDeadlineDays: booking.cancellationDeadlineDays,
    })
  );
}

export function cancellationFeePreview(
  booking: CancelBookingPreview,
  applyFee: boolean,
): { fee: number; refund: number; rent: number } {
  const rent = rentAmountFromBooking(booking);
  const fee = applyFee
    ? computeCancellationFee(rent, booking.cancellationFeeType, booking.cancellationFeeValue)
    : 0;
  return { fee, refund: Math.max(0, rent - fee), rent };
}

export function toCancelBookingPreview(booking: BookingDetail): CancelBookingPreview {
  return {
    id: booking.id,
    status: booking.status,
    checkIn: booking.checkIn,
    totalAmount: booking.totalAmount,
    securityDeposit: booking.securityDeposit,
    currency: booking.currency,
    cancellationPolicy: booking.property.cancellationPolicy,
    cancellationFeeType: booking.property.cancellationFeeType,
    cancellationFeeValue: booking.property.cancellationFeeValue,
    cancellationDeadlineDays: booking.property.cancellationDeadlineDays ?? 0,
  };
}
