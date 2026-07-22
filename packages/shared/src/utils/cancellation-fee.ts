export const CancellationFeeTypes = ['PERCENT', 'FIXED'] as const;
export type CancellationFeeType = (typeof CancellationFeeTypes)[number];

export const MAX_CANCELLATION_FEE_PERCENT = 50;

/**
 * Amount of rent kept (not refunded) when a cancellation fee is applied.
 * `rentAmount` and fixed `feeValue` are in minor currency units.
 */
export function computeCancellationFee(
  rentAmount: number,
  feeType: CancellationFeeType,
  feeValue: number,
): number {
  if (rentAmount <= 0 || feeValue <= 0) {
    return 0;
  }
  if (feeType === 'FIXED') {
    return Math.min(feeValue, rentAmount);
  }
  return Math.round((rentAmount * feeValue) / 100);
}

/** Guest may cancel whenever the policy allows refunds (fee is applied per its type). */
export function isGuestCancellationAllowed(cancellationPolicy: string): boolean {
  return cancellationPolicy !== 'NON_REFUNDABLE';
}
