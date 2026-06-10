import type { CompareSharePair, CreateCompareShareResult } from '@repo/shared';

import { api } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function createCompareShareLink(
  leftId: string,
  rightId: string,
): Promise<CreateCompareShareResult> {
  return api.post<CreateCompareShareResult>('/compare-share', { leftId, rightId });
}

export async function resolveCompareShareLink(token: string): Promise<CompareSharePair | null> {
  const url = `${BASE_URL}/compare-share/${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const envelope = (await res.json()) as { data: CompareSharePair };
    return envelope.data;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[resolveCompareShareLink] request failed:', err);
    }
    return null;
  }
}
