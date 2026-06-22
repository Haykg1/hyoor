import type {
  CreatePromotionInput,
  CreatePromotionResult,
  HotDealProperty,
  ListPromotionsQuery,
  PaginatedResponse,
  PromotionSummary,
} from '@repo/shared';

import { api } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

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

export async function listHotDeals(): Promise<HotDealProperty[]> {
  try {
    const res = await fetch(`${BASE_URL}/promotions/hot-deals`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const envelope = (await res.json()) as
      | { success: true; data: HotDealProperty[] }
      | HotDealProperty[];
    return Array.isArray(envelope) ? envelope : envelope.data;
  } catch {
    return [];
  }
}
