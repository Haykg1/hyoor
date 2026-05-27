'use client';

import { useCallback } from 'react';

import { useRouter } from '@/i18n/navigation';
import type { PropertySortValue } from '@/lib/api/properties';

export interface SearchNavigationParams {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  sortBy?: PropertySortValue;
}

export function buildSearchQueryString(params?: SearchNavigationParams): string {
  const query = new URLSearchParams();
  const location = params?.location?.trim();
  if (location) query.set('location', location);
  if (params?.checkIn) query.set('checkIn', params.checkIn);
  if (params?.checkOut) query.set('checkOut', params.checkOut);
  if (params?.guests && params.guests > 1) query.set('guests', String(params.guests));
  if (params?.sortBy && params.sortBy !== 'createdAt') query.set('sortBy', params.sortBy);
  return query.toString();
}

interface SearchNavigation {
  goToSearch: (params?: SearchNavigationParams) => void;
}

/**
 * Centralizes building the /search URL so callers don't reinvent query-string
 * assembly. Trims empty values and omits defaults to keep the URL clean.
 */
export function useSearchNavigation(): SearchNavigation {
  const router = useRouter();
  const goToSearch = useCallback(
    (params?: SearchNavigationParams) => {
      const qs = buildSearchQueryString(params);
      router.push(qs ? `/search?${qs}` : '/search');
    },
    [router],
  );
  return { goToSearch };
}
