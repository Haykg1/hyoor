'use client';

import { SEARCH_DISPLAY_CURRENCIES, type PropertySortValue } from '@repo/shared';
import { Map, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { SearchFilters } from '@/hooks/use-search-filters';
import {
  searchFiltersToNavigationParams,
  useSearchNavigation,
} from '@/hooks/use-search-navigation';
import { getDisplayCurrencyDefault } from '@/lib/api/currency';
import { PROPERTY_SORT_VALUES } from '@/lib/api/properties';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/store/search.store';

interface SearchToolbarProps {
  total: number;
  filters: SearchFilters;
  geoCurrency?: string;
}

const SORT_LABEL_KEYS: Record<PropertySortValue, string> = {
  recommended: 'recommended',
  priceAsc: 'price_asc',
  priceDesc: 'price_desc',
  topRated: 'top_rated',
  mostReviewed: 'most_reviewed',
};

export function SearchToolbar({
  total,
  filters,
  geoCurrency,
}: SearchToolbarProps): React.JSX.Element {
  const t = useTranslations('search');
  const { goToSearch } = useSearchNavigation();
  const isFiltersOpen = useSearchStore((s) => s.isFiltersOpen);
  const setFiltersOpen = useSearchStore((s) => s.setFiltersOpen);
  const [resolvedGeo, setResolvedGeo] = useState(geoCurrency ?? '');
  useEffect(() => {
    if (geoCurrency) {
      setResolvedGeo(geoCurrency);
      return;
    }
    let cancelled = false;
    void getDisplayCurrencyDefault().then((currency) => {
      if (!cancelled) setResolvedGeo(currency);
    });
    return () => {
      cancelled = true;
    };
  }, [geoCurrency]);
  const currencyOptions = useMemo(() => {
    const options = [...SEARCH_DISPLAY_CURRENCIES] as string[];
    if (resolvedGeo && !options.includes(resolvedGeo)) {
      options.push(resolvedGeo);
    }
    return options;
  }, [resolvedGeo]);
  const activeCurrency = filters.displayCurrency || resolvedGeo || 'AMD';
  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    goToSearch(
      searchFiltersToNavigationParams({
        ...filters,
        sortBy: event.target.value as PropertySortValue,
        aiMatch: false,
      }),
    );
  }
  function handleCurrencyChange(currency: string): void {
    goToSearch(
      searchFiltersToNavigationParams({
        ...filters,
        displayCurrency: currency,
        minPrice: undefined,
        maxPrice: undefined,
        aiMatch: false,
      }),
    );
  }
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setFiltersOpen(!isFiltersOpen)}
        className={cn(
          'inline-flex h-8 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium shadow-sm transition-colors',
          isFiltersOpen
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input bg-transparent',
        )}
        aria-pressed={isFiltersOpen}
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
        className="flex h-9 w-48 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {PROPERTY_SORT_VALUES.map((value) => (
          <option key={value} value={value}>
            {t(`sort.${SORT_LABEL_KEYS[value]}`)}
          </option>
        ))}
      </select>
      <div
        className="inline-flex h-9 items-center rounded-md border border-input p-0.5"
        role="group"
        aria-label={t('currency.label')}
      >
        {currencyOptions.map((currency) => (
          <button
            key={currency}
            type="button"
            onClick={() => handleCurrencyChange(currency)}
            className={cn(
              'inline-flex h-8 items-center rounded-sm px-2.5 text-xs font-medium transition-colors',
              activeCurrency === currency
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={activeCurrency === currency}
          >
            {currency}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('count', { count: total })}</span>
        <button
          type="button"
          disabled
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-transparent px-3 text-xs font-medium text-muted-foreground opacity-60"
          title={t('map_coming_soon')}
        >
          <Map className="h-4 w-4" aria-hidden />
          {t('map_button')}
        </button>
      </div>
    </div>
  );
}
