import type { BookingDetail } from '@repo/shared';

/** Resolve host payout in settlement units; falls back when fee split is incomplete. */
export function resolveHostPayoutAmount(booking: BookingDetail): number {
  if (booking.hostPayoutAmount != null) return booking.hostPayoutAmount;
  const rent = Math.max(0, booking.totalAmount - booking.securityDeposit);
  if (booking.platformFeeAmount != null) {
    return Math.max(0, rent - booking.platformFeeAmount);
  }
  return rent;
}

export function resolvePlatformFeeAmount(booking: BookingDetail): number {
  if (booking.platformFeeAmount != null) return booking.platformFeeAmount;
  return 0;
}

/** Returns a display name, or null when only a translated fallback should be used. */
export function guestDisplayName(guest: BookingDetail['guest']): string | null {
  const parts = [guest.firstName, guest.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (guest.email) return guest.email;
  return null;
}
