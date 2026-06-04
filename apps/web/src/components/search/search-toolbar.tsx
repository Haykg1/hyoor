'use client';

import { Map, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SearchFilters } from '@/hooks/use-search-filters';
import {
  searchFiltersToNavigationParams,
  useSearchNavigation,
} from '@/hooks/use-search-navigation';
import { PROPERTY_SORT_VALUES, type PropertySortValue } from '@/lib/api/properties';
import { useSearchStore } from '@/store/search.store';

interface SearchToolbarProps {
  total: number;
  filters: SearchFilters;
}

export function SearchToolbar({ total, filters }: SearchToolbarProps): React.JSX.Element {
  const t = useTranslations('search');
  const { goToSearch } = useSearchNavigation();
  const { setAdvancedOpen } = useSearchStore();

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    goToSearch(
      searchFiltersToNavigationParams({
        ...filters,
        sortBy: event.target.value as PropertySortValue,
      }),
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setAdvancedOpen(true)}
        className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-sm"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {t('filters_button')}
      </button>
      <label className="sr-only" htmlFor="search-sort">
        {t('sort.label')}
      </label>
      <select
        id="search-sort"
        value={filters.sortBy}
        onChange={handleSortChange}
        className="flex h-9 w-44 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {PROPERTY_SORT_VALUES.map((value) => (
          <option key={value} value={value}>
            {value === 'createdAt' ? t('sort.newest') : t('sort.price_asc')}
          </option>
        ))}
      </select>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('count', { count: total })}</span>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="inline-flex h-8 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-sm opacity-60"
        >
          <Map className="h-4 w-4" aria-hidden />
          {t('map_button')}
        </button>
      </div>
    </div>
  );
}
