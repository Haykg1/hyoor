'use client';

import type { ListFavoritesQuery, PropertySummary } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';
import { Heart, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  FavoritesToolbar,
  type FavoritesFilterState,
} from '@/components/favorites/favorites-toolbar';
import { PropertyCard } from '@/components/property';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { listFavorites } from '@/lib/api/favorites';
import { countAdvancedFilters, countAllAppliedFilters } from '@/lib/favorites-filters';
import { useAuthStore } from '@/store/auth.store';

const DEFAULT_FILTERS: FavoritesFilterState = {
  q: '',
  regions: [],
  cities: [],
  propertyType: '',
  minPrice: '',
  maxPrice: '',
  maxGuests: '',
  minBedrooms: '',
  sortBy: 'favoritedAt',
  sortOrder: 'desc',
};

function filtersToQuery(filters: FavoritesFilterState, page: number): ListFavoritesQuery {
  const query: ListFavoritesQuery = {
    page,
    limit: DEFAULT_PAGE_SIZE,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };
  const q = filters.q.trim();
  if (q) query.q = q;
  if (filters.regions.length > 0) query.regions = filters.regions;
  if (filters.cities.length > 0) query.cities = filters.cities;
  if (filters.propertyType) query.propertyType = filters.propertyType;
  const minPrice = Number.parseInt(filters.minPrice, 10);
  if (!Number.isNaN(minPrice)) query.minPrice = minPrice;
  const maxPrice = Number.parseInt(filters.maxPrice, 10);
  if (!Number.isNaN(maxPrice)) query.maxPrice = maxPrice;
  const maxGuests = Number.parseInt(filters.maxGuests, 10);
  if (!Number.isNaN(maxGuests)) query.maxGuests = maxGuests;
  const minBedrooms = Number.parseInt(filters.minBedrooms, 10);
  if (!Number.isNaN(minBedrooms)) query.minBedrooms = minBedrooms;
  return query;
}

export default function FavoritesPage(): React.JSX.Element {
  const t = useTranslations('favorites');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoadingAuth = useAuthStore((s) => s.isLoading);
  const [draftFilters, setDraftFilters] = useState<FavoritesFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FavoritesFilterState>(DEFAULT_FILTERS);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFavorites(filtersToQuery(appliedFilters, page));
      setProperties(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/auth/login');
        return;
      }
      setProperties([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, router]);
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (user && user.role !== 'GUEST') {
      router.replace(user.role === 'HOST' ? '/dashboard' : '/');
      return;
    }
    void fetchList();
  }, [isLoadingAuth, isAuthenticated, user, appliedFilters, page, router, fetchList]);
  function handleDraftChange(patch: Partial<FavoritesFilterState>): void {
    setDraftFilters((prev) => ({ ...prev, ...patch }));
  }
  function handleSearchSubmit(): void {
    setAppliedFilters({
      ...draftFilters,
      q: draftFilters.q.trim(),
    });
    setPage(1);
  }
  function handleReset(): void {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  }
  if (isLoadingAuth || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle', { count: total })}</p>
      </div>
      <FavoritesToolbar
        draftFilters={draftFilters}
        appliedFilterCount={countAllAppliedFilters(appliedFilters)}
        advancedAppliedCount={countAdvancedFilters(appliedFilters)}
        onDraftChange={handleDraftChange}
        onSearchSubmit={handleSearchSubmit}
        onReset={handleReset}
      />
      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 px-6 py-14 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t('empty.title')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('empty.description')}</p>
          <Link
            href="/search"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            {t('empty.explore')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium shadow-sm disabled:opacity-50"
          >
            {t('pagination.prev')}
          </button>
          <span className="text-sm text-muted-foreground">
            {t('pagination.page', { page, totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium shadow-sm disabled:opacity-50"
          >
            {t('pagination.next')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
