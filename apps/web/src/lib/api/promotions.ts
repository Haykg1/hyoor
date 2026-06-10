import type {
  CreatePromotionInput,
  CreatePromotionResult,
  ListPromotionsQuery,
  PaginatedResponse,
  PromotionSummary,
} from '@repo/shared';

import { api } from '@/lib/api';

function setOptionalNumber(query: URLSearchParams, key: string, value: number | undefined): void {
  if (value !== undefined) query.set(key, String(value));
}

export async function listPromotions(
  params: ListPromotionsQuery = {},
): Promise<PaginatedResponse<PromotionSummary>> {
  const query = new URLSearchParams();
  if (params.propertyId) query.set('propertyId', params.propertyId);
  setOptionalNumber(query, 'page', params.page);
  setOptionalNumber(query, 'limit', params.limit);
  const qs = query.toString();
  return api.get<PaginatedResponse<PromotionSummary>>(`/promotions${qs ? `?${qs}` : ''}`);
}

export async function createPromotion(input: CreatePromotionInput): Promise<CreatePromotionResult> {
  return api.post<CreatePromotionResult>('/promotions', input);
}

export async function deletePromotion(promotionId: string): Promise<void> {
  await api.delete(`/promotions/${promotionId}`);
}
