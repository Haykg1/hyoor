'use client';

import { PropertyTypes, type PropertyType } from '@repo/shared';
import { ARMENIA_REGION_OPTIONS, getCitiesForRegions } from '@repo/shared/constants';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { FilterMultiSelect } from '@/components/favorites/filter-multi-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

export interface FavoritesFilterState {
  q: string;
  regions: string[];
  cities: string[];
  propertyType: PropertyType | '';
  minPrice: string;
  maxPrice: string;
  maxGuests: string;
  minBedrooms: string;
  sortBy: 'favoritedAt' | 'pricePerNight';
  sortOrder: 'asc' | 'desc';
}

interface FavoritesToolbarProps {
  draftFilters: FavoritesFilterState;
  appliedFilterCount: number;
  advancedAppliedCount: number;
  onDraftChange: (patch: Partial<FavoritesFilterState>) => void;
  onSearchSubmit: () => void;
  onReset: () => void;
}

export function FavoritesToolbar({
  draftFilters,
  appliedFilterCount,
  advancedAppliedCount,
  onDraftChange,
  onSearchSubmit,
  onReset,
}: FavoritesToolbarProps): React.JSX.Element {
  const t = useTranslations('favorites.filters');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const cityOptions = useMemo(
    () => getCitiesForRegions(draftFilters.regions),
    [draftFilters.regions],
  );
  function handleRegionsChange(regions: string[]): void {
    const available = new Set(getCitiesForRegions(regions));
    const cities = draftFilters.cities.filter((city) => available.has(city));
    onDraftChange({ regions, cities });
  }
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit();
    }
  }
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('title_placeholder')}
            value={draftFilters.q}
            onChange={(e) => onDraftChange({ q: e.target.value })}
            onKeyDown={handleSearchKeyDown}
            className="h-10 pl-9"
            aria-label={t('title_placeholder')}
          />
        </div>
        <Button type="button" className="h-10 shrink-0 gap-2 px-6" onClick={onSearchSubmit}>
          <Search className="h-4 w-4" />
          {t('search')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('more_filters')}
          {advancedAppliedCount > 0 ? (
            <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 text-xs">
              {advancedAppliedCount}
            </Badge>
          ) : null}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')}
          />
        </Button>
        {appliedFilterCount > 0 ? (
          <Badge variant="outline" className="font-normal">
            {t('applied_count', { count: appliedFilterCount })}
          </Badge>
        ) : null}
        {appliedFilterCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onReset}>
            <X className="h-4 w-4" />
            {t('clear_filters')}
          </Button>
        ) : null}
      </div>
      {advancedOpen ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FilterMultiSelect
              label={t('regions_label')}
              placeholder={t('regions_placeholder')}
              options={ARMENIA_REGION_OPTIONS}
              selected={draftFilters.regions}
              onChange={handleRegionsChange}
            />
            <FilterMultiSelect
              label={t('cities_label')}
              placeholder={t('cities_placeholder')}
              options={cityOptions}
              selected={draftFilters.cities}
              onChange={(cities) => onDraftChange({ cities })}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('property_type')}
              </label>
              <select
                value={draftFilters.propertyType}
                onChange={(e) =>
                  onDraftChange({ propertyType: (e.target.value || '') as PropertyType | '' })
                }
                className={SELECT_CLASS}
              >
                <option value="">{t('all_types')}</option>
                {PropertyTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('min_price')}</label>
              <Input
                type="number"
                min={0}
                placeholder={t('min_price')}
                value={draftFilters.minPrice}
                onChange={(e) => onDraftChange({ minPrice: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('max_price')}</label>
              <Input
                type="number"
                min={0}
                placeholder={t('max_price')}
                value={draftFilters.maxPrice}
                onChange={(e) => onDraftChange({ maxPrice: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('max_guests')}</label>
              <Input
                type="number"
                min={1}
                placeholder={t('max_guests')}
                value={draftFilters.maxGuests}
                onChange={(e) => onDraftChange({ maxGuests: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('min_bedrooms')}
              </label>
              <Input
                type="number"
                min={0}
                placeholder={t('min_bedrooms')}
                value={draftFilters.minBedrooms}
                onChange={(e) => onDraftChange({ minBedrooms: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t('sort')}</label>
              <select
                value={`${draftFilters.sortBy}:${draftFilters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split(':') as [
                    'favoritedAt' | 'pricePerNight',
                    'asc' | 'desc',
                  ];
                  onDraftChange({ sortBy, sortOrder });
                }}
                className={SELECT_CLASS}
              >
                <option value="favoritedAt:desc">{t('sort_newest')}</option>
                <option value="favoritedAt:asc">{t('sort_oldest')}</option>
                <option value="pricePerNight:asc">{t('sort_price_asc')}</option>
                <option value="pricePerNight:desc">{t('sort_price_desc')}</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
