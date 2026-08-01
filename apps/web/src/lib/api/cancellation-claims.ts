import type { AdminCancellationFeeClaim, CancellationFeeClaimView } from '@repo/shared';

import { api } from '@/lib/api';

export async function listPendingCancellationClaims(): Promise<AdminCancellationFeeClaim[]> {
  return api.get<AdminCancellationFeeClaim[]>('/admin/cancellation-fee-claims');
}

export async function reviewCancellationClaim(
  claimId: string,
  input: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
): Promise<CancellationFeeClaimView> {
  return api.patch<CancellationFeeClaimView>(`/admin/cancellation-fee-claims/${claimId}`, input);
}
