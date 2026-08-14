import type { ContactInquiryRequest, ContactInquiryResponse } from '@repo/shared';

import { api } from '@/lib/api';

export async function submitContactInquiry(
  payload: ContactInquiryRequest,
): Promise<ContactInquiryResponse> {
  return api.post<ContactInquiryResponse>('/contact', payload);
}
