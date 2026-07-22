import type { AdminDepositClaim, PhotoMimeType, SecurityDepositClaimView } from '@repo/shared';
import { PhotoMimeTypes } from '@repo/shared';

import { api } from '@/lib/api';
import { compressImage } from '@/lib/compress-image';

export interface SubmitDepositClaimInput {
  amount: number;
  reason: string;
  evidenceKeys: string[];
}

export async function uploadDepositClaimPhoto(bookingId: string, file: File): Promise<string> {
  const mimeType = (
    PhotoMimeTypes.includes(file.type as PhotoMimeType) ? file.type : 'image/jpeg'
  ) as PhotoMimeType;
  const compressed = await compressImage(file);
  const { uploadUrl, key } = await api.post<{ uploadUrl: string; key: string }>(
    `/bookings/${bookingId}/deposit-claim/photos/presigned-url`,
    { mimeType },
  );
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: compressed,
    headers: { 'Content-Type': mimeType },
  });
  if (!putRes.ok) throw new Error(`Photo upload failed: ${putRes.status}`);
  return key;
}

export async function submitDepositClaim(
  bookingId: string,
  input: SubmitDepositClaimInput,
): Promise<SecurityDepositClaimView> {
  return api.post<SecurityDepositClaimView>(`/bookings/${bookingId}/deposit-claim`, input);
}

export async function releaseDeposit(bookingId: string): Promise<{ depositStatus: string }> {
  return api.post<{ depositStatus: string }>(`/bookings/${bookingId}/deposit-release`, {});
}

export async function listPendingDepositClaims(): Promise<AdminDepositClaim[]> {
  return api.get<AdminDepositClaim[]>('/admin/deposit-claims');
}

export async function reviewDepositClaim(
  claimId: string,
  input: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
): Promise<SecurityDepositClaimView> {
  return api.patch<SecurityDepositClaimView>(`/admin/deposit-claims/${claimId}`, input);
}
