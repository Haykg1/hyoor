'use client';

import type { ReviewView } from '@repo/shared';
import { BadgeCheck, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';

import { usePropertyReviews } from '../../hooks/use-property-reviews';

import { WriteReviewModal } from './write-review-modal';

interface PropertyReviewsListProps {
  propertyId: string;
  initialReviews: ReviewView[];
  avgRating: number | null;
  reviewCount: number;
}

function authorInitials(first: string | null, last: string | null): string {
  return [(first ?? '')[0], (last ?? '')[0]].filter(Boolean).join('').toUpperCase() || '?';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
        />
      ))}
    </div>
  );
}

export function PropertyReviewsList({
  propertyId,
  initialReviews,
  avgRating,
  reviewCount,
}: PropertyReviewsListProps): React.JSX.Element {
  const t = useTranslations('property_detail.reviews');
  const { isAuthenticated, user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    reviews,
    allReviews,
    isLoading,
    sortOrder,
    ratingFilter,
    distribution,
    setSortOrder,
    setRatingFilter,
    refetch,
  } = usePropertyReviews(propertyId, initialReviews);

  const hasReviewed = user !== null && allReviews.some((r) => r.authorId === user.id);

  const displayedAvg =
    avgRating ??
    (allReviews.length > 0
      ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      : null);
  const displayedCount = reviewCount > 0 ? reviewCount : allReviews.length;
  const maxBarCount = Math.max(...Object.values(distribution), 1);

  return (
    <section className="space-y-6 border-b border-border py-8">
      {/* Rating summary header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          {/* Avg score */}
          <div className="flex flex-col items-start gap-1">
            {displayedAvg !== null && (
              <>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold leading-none">{displayedAvg.toFixed(1)}</span>
                  <span className="mb-1 text-xl text-muted-foreground">/5</span>
                </div>
                <StarRow rating={Math.round(displayedAvg)} size="md" />
                <p className="text-sm text-muted-foreground">
                  {t('based_on', { count: displayedCount })}
                </p>
              </>
            )}
          </div>

          {/* Star distribution bars */}
          {allReviews.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = distribution[star];
                const pct = Math.round((count / maxBarCount) * 100);
                const isActive = ratingFilter === star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingFilter(isActive ? null : star)}
                    className="group flex items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-pressed={isActive}
                    title={t('filter_by_stars', { count: star })}
                  >
                    <span className="w-3 text-right text-xs text-muted-foreground">{star}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-muted sm:w-40">
                      <div
                        className={`h-full rounded-full transition-all ${isActive ? 'bg-amber-500' : 'bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-5 text-xs text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Write review button / already-reviewed note */}
        {isAuthenticated &&
          (hasReviewed ? (
            <p className="shrink-0 text-sm text-muted-foreground">{t('already_reviewed')}</p>
          ) : (
            <Button className="shrink-0" onClick={() => setModalOpen(true)}>
              {t('write_review')}
            </Button>
          ))}
      </div>

      {/* Active filter pill */}
      {ratingFilter !== null && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('filtering_by', { count: ratingFilter })}
          </span>
          <button
            type="button"
            onClick={() => setRatingFilter(null)}
            className="text-xs text-primary underline underline-offset-2"
          >
            {t('clear_filter')}
          </button>
        </div>
      )}

      {/* Sort controls */}
      {allReviews.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('sort_label')}:</span>
          <button
            type="button"
            onClick={() => setSortOrder('desc')}
            className={`rounded px-3 py-1 text-sm transition-colors ${sortOrder === 'desc' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {t('sort_newest')}
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('asc')}
            className={`rounded px-3 py-1 text-sm transition-colors ${sortOrder === 'asc' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {t('sort_oldest')}
          </button>
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {ratingFilter !== null ? t('no_reviews_for_filter') : t('empty')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {reviews.map((review) => (
            <li key={review.id} className="flex gap-4 py-5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs">
                  {authorInitials(review.author.firstName, review.author.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {[review.author.firstName, review.author.lastName].filter(Boolean).join(' ') ||
                      'Guest'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t('verified')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <StarRow rating={review.rating} />
                {review.comment ? (
                  <p className="text-sm text-foreground/80">{review.comment}</p>
                ) : (
                  <p className="text-xs italic text-muted-foreground">{t('no_comment')}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <WriteReviewModal
        propertyId={propertyId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onReviewSubmitted={refetch}
        hasReviewed={hasReviewed}
      />
    </section>
  );
}
