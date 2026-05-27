import type { PaginatedResponse, ReviewView } from '@repo/shared';

import { api } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function listPropertyReviews(
  propertyId: string,
  {
    limit = 100,
    page = 1,
    sortOrder = 'desc',
    rating,
  }: { limit?: number; page?: number; sortOrder?: 'asc' | 'desc'; rating?: number } = {},
): Promise<PaginatedResponse<ReviewView>> {
  const params: Record<string, string> = {
    limit: String(limit),
    page: String(page),
    sortOrder,
  };
  if (rating != null) params.rating = String(rating);
  const query = new URLSearchParams(params);
  const url = `${BASE_URL}/reviews/property/${propertyId}?${query.toString()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const envelope = (await res.json()) as ApiEnvelope<PaginatedResponse<ReviewView>>;
    return envelope.data;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[listPropertyReviews] request failed:', err);
    }
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }
}

export interface CreateReviewInput {
  bookingId: string;
  rating: number;
  comment?: string;
}

export async function createReview(input: CreateReviewInput): Promise<ReviewView> {
  return api.post<ReviewView>('/reviews', { ...input, target: 'PROPERTY' });
}
