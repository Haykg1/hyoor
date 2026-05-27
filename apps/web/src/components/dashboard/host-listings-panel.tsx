'use client';

import type { HostListingSummary } from '@repo/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { HostListingCard } from './host-listing-card';

interface HostListingsPanelProps {
  listings: HostListingSummary[];
  isLoading: boolean;
  page: number;
  limit: 10 | 20 | 30;
  totalPages: number;
  total: number;
  showDelete: boolean;
  emptyKey: 'empty_listings' | 'empty_disabled';
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 20 | 30) => void;
  onDelete: (id: string) => Promise<void>;
}

const PAGE_SIZES = [10, 20, 30] as const;

export function HostListingsPanel({
  listings,
  isLoading,
  page,
  limit,
  totalPages,
  total,
  showDelete,
  emptyKey,
  onPageChange,
  onLimitChange,
  onDelete,
}: HostListingsPanelProps): React.JSX.Element {
  const t = useTranslations('dashboard');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(emptyKey)}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {listings.map((listing) => (
          <HostListingCard
            key={listing.id}
            listing={listing}
            showDelete={showDelete}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Pagination toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('pagination.page_size')}:</span>
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onLimitChange(size)}
              className={`rounded px-2 py-0.5 text-sm transition-colors ${
                limit === size ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('pagination.page_of', { page, totalPages, total })}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
