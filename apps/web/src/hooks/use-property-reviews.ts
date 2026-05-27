'use client';

import type { ReviewView } from '@repo/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listPropertyReviews } from '@/lib/api/reviews';

type SortOrder = 'asc' | 'desc';

export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

interface UsePropertyReviewsReturn {
  reviews: ReviewView[];
  allReviews: ReviewView[];
  isLoading: boolean;
  sortOrder: SortOrder;
  ratingFilter: number | null;
  distribution: RatingDistribution;
  setSortOrder: (order: SortOrder) => void;
  setRatingFilter: (rating: number | null) => void;
  refetch: () => Promise<void>;
}

export function usePropertyReviews(
  propertyId: string,
  initialReviews: ReviewView[],
): UsePropertyReviewsReturn {
  // Base (unfiltered) reviews — used for the distribution bars and hasReviewed check.
  const [baseReviews, setBaseReviews] = useState<ReviewView[]>(initialReviews);
  // Filtered reviews returned by the backend when a rating filter is active.
  const [filteredReviews, setFilteredReviews] = useState<ReviewView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  // Avoid stale closure issues when both effects fire close together.
  const ratingFilterRef = useRef(ratingFilter);
  ratingFilterRef.current = ratingFilter;

  const fetchBase = useCallback(
    async (order: SortOrder) => {
      setIsLoading(true);
      try {
        const result = await listPropertyReviews(propertyId, { sortOrder: order, limit: 100 });
        setBaseReviews(result.data);
      } catch {
        // keep existing reviews on error
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId],
  );

  const fetchFiltered = useCallback(
    async (order: SortOrder, rating: number) => {
      setIsLoading(true);
      try {
        const result = await listPropertyReviews(propertyId, {
          sortOrder: order,
          limit: 100,
          rating,
        });
        setFilteredReviews(result.data);
      } catch {
        setFilteredReviews([]);
      } finally {
        setIsLoading(false);
      }
    },
    [propertyId],
  );

  // Re-fetch base whenever sort order changes; also re-fetch filtered view if a filter is active.
  useEffect(() => {
    void fetchBase(sortOrder);
    if (ratingFilterRef.current !== null) {
      void fetchFiltered(sortOrder, ratingFilterRef.current);
    }
  }, [sortOrder, fetchBase, fetchFiltered]);

  // Re-fetch filtered view whenever the rating filter changes.
  useEffect(() => {
    if (ratingFilter === null) {
      setFilteredReviews([]);
      return;
    }
    void fetchFiltered(sortOrder, ratingFilter);
    // sortOrder is intentionally excluded — the sort effect handles combined re-fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingFilter, fetchFiltered]);

  const reviews = ratingFilter !== null ? filteredReviews : baseReviews;

  const distribution = useMemo<RatingDistribution>(() => {
    const dist: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of baseReviews) {
      const star = r.rating as 1 | 2 | 3 | 4 | 5;
      if (star >= 1 && star <= 5) dist[star] += 1;
    }
    return dist;
  }, [baseReviews]);

  const refetch = useCallback(async () => {
    await fetchBase(sortOrder);
    if (ratingFilter !== null) {
      await fetchFiltered(sortOrder, ratingFilter);
    }
  }, [fetchBase, fetchFiltered, sortOrder, ratingFilter]);

  return {
    reviews,
    allReviews: baseReviews,
    isLoading,
    sortOrder,
    ratingFilter,
    distribution,
    setSortOrder,
    setRatingFilter,
    refetch,
  };
}
