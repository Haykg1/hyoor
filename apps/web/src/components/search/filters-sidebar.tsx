'use client';

import type { PlaceResult, PropertyType } from '@repo/shared';
import { propertyTypeLabelKey } from '@repo/shared';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { PlaceAutocomplete } from '@/components/search/place-autocomplete';
import { RatingFilter } from '@/components/search/rating-filter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { SearchFilters } from '@/hooks/use-search-filters';
import {
  searchFiltersToNavigationParams,
  useSearchNavigation,
} from '@/hooks/use-search-navigation';
import { formatCurrencyAmount } from '@/lib/format/price';
import { AMENITIES_CATALOG } from '@/lib/listing/amenities-catalog';
import { placeResultToLocationFilters } from '@/lib/search/place-to-filters';
import { priceSliderMax, priceSliderStep } from '@/lib/search/price-slider';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/store/search.store';

const ROOM_OPTIONS = [undefined, 1, 2, 3, 4] as const;
const PROPERTY_TYPE_OPTIONS: PropertyType[] = [
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'GUESTHOUSE',
  'STUDIO',
  'HOTEL_ROOM',
];

interface FiltersSidebarProps {
  initialFilters: SearchFilters;
  displayCurrency: string;
}

export function FiltersSidebar({
  initialFilters,
  displayCurrency,
}: FiltersSidebarProps): React.JSX.Element {
  const t = useTranslations('search.filters');
  const tSearch = useTranslations('search');
  const tc = useTranslations('property_card.categories');
  const { goToSearch } = useSearchNavigation();
  const {
    filters,
    isFiltersOpen,
    isMoreFiltersOpen,
    setFiltersOpen,
    setMoreFiltersOpen,
    setFilters,
    resetAdvanced,
    hydrateFromUrlFilters,
  } = useSearchStore();
  const [amenityQuery, setAmenityQuery] = useState('');
  const [guestsInput, setGuestsInput] = useState(String(initialFilters.guests));
  const sliderMax = priceSliderMax(displayCurrency);
  const sliderStep = priceSliderStep(displayCurrency);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialFilters.minPrice ?? 0,
    initialFilters.maxPrice ?? sliderMax,
  ]);
  useEffect(() => {
    hydrateFromUrlFilters(initialFilters);
    const max = priceSliderMax(initialFilters.displayCurrency ?? displayCurrency);
    setPriceRange([initialFilters.minPrice ?? 0, initialFilters.maxPrice ?? max]);
    setGuestsInput(String(initialFilters.guests));
  }, [hydrateFromUrlFilters, initialFilters, displayCurrency]);
  useEffect(() => {
    setPriceRange((prev) => {
      const nextMax = Math.min(prev[1] ?? sliderMax, sliderMax);
      const nextMin = Math.min(prev[0] ?? 0, nextMax);
      return [nextMin, nextMax];
    });
  }, [sliderMax]);
  const visibleAmenities = useMemo(() => {
    const q = amenityQuery.trim().toLowerCase();
    if (!q) return AMENITIES_CATALOG;
    return AMENITIES_CATALOG.filter((a) => a.name.toLowerCase().includes(q));
  }, [amenityQuery]);
  function apply(next: SearchFilters): void {
    goToSearch(
      searchFiltersToNavigationParams({
        ...next,
        displayCurrency: next.displayCurrency ?? displayCurrency,
        aiMatch: false,
      }),
    );
  }
  function patchAndApply(partial: Partial<SearchFilters>): void {
    const next = {
      ...filters,
      ...partial,
      displayCurrency: filters.displayCurrency ?? displayCurrency,
      aiMatch: false,
    };
    setFilters(partial);
    apply(next);
  }
  function handlePlaceSelect(place: PlaceResult): void {
    patchAndApply(placeResultToLocationFilters(place));
  }
  function handleLocationChange(value: string): void {
    setFilters({
      location: value,
      searchCity: undefined,
      searchStreet: undefined,
      searchBuildingNumber: undefined,
      searchPlaceKind: undefined,
      searchLatitude: undefined,
      searchLongitude: undefined,
    });
  }
  function handlePriceCommit(values: number[]): void {
    const min = values[0] ?? 0;
    const max = values[1] ?? sliderMax;
    const minPrice = min <= 0 ? undefined : min;
    const maxPrice = max >= sliderMax ? undefined : max;
    patchAndApply({ minPrice, maxPrice, displayCurrency });
  }
  function handleReset(): void {
    const { location, checkIn, checkOut, guests, sortBy } = filters;
    resetAdvanced();
    const cleared: SearchFilters = {
      ...filters,
      location,
      checkIn,
      checkOut,
      guests,
      sortBy,
      displayCurrency,
      region: '',
      searchCity: undefined,
      searchStreet: undefined,
      searchBuildingNumber: undefined,
      searchPlaceKind: undefined,
      searchLatitude: undefined,
      searchLongitude: undefined,
      propertyType: undefined,
      aiMatch: false,
      minBedrooms: undefined,
      minBeds: undefined,
      minBathrooms: undefined,
      minAdults: undefined,
      minChildren: undefined,
      minInfants: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minCleaningFee: undefined,
      maxCleaningFee: undefined,
      minSecurityDeposit: undefined,
      maxSecurityDeposit: undefined,
      minNights: undefined,
      maxNights: undefined,
      smokingAllowed: undefined,
      petsAllowed: undefined,
      partiesAllowed: undefined,
      amenities: [],
      minAvgRating: undefined,
      minReviewCount: undefined,
    };
    apply(cleared);
    setPriceRange([0, sliderMax]);
  }
  return (
    <div
      className={cn(
        'overflow-hidden transition-[max-width,opacity,margin] duration-500 ease-in-out',
        isFiltersOpen
          ? 'pointer-events-auto mb-0 max-w-full opacity-100 lg:mr-0 lg:max-w-xs xl:max-w-sm'
          : 'pointer-events-none mb-0 max-w-0 opacity-0 lg:mr-0',
      )}
      aria-hidden={!isFiltersOpen}
    >
      <aside className="w-72 shrink-0 rounded-2xl border border-border/60 bg-card p-4 shadow-sm xl:w-80">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {t('title')}
          </p>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={tSearch('filters_close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('location')}</label>
            <PlaceAutocomplete
              value={filters.location || filters.searchCity || filters.region}
              onChange={handleLocationChange}
              onSelectPlace={handlePlaceSelect}
              placeholder={t('location_placeholder')}
              level="any"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('dates')}</p>
            <div className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 shadow-sm">
              <DateRangePicker
                from={filters.checkIn}
                to={filters.checkOut}
                placeholder={`${tSearch('check_in')} – ${tSearch('check_out')}`}
                numberOfMonths={1}
                align="start"
                onSelect={(from, to) => {
                  if (from && to) {
                    patchAndApply({ checkIn: from, checkOut: to });
                    return;
                  }
                  if (!from && !to) {
                    patchAndApply({ checkIn: '', checkOut: '' });
                    return;
                  }
                  setFilters({ checkIn: from, checkOut: to });
                }}
                triggerClassName="w-full text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="filters-guests">
              {t('guests')}
            </label>
            <Input
              id="filters-guests"
              type="number"
              min={1}
              value={guestsInput}
              onChange={(event) => setGuestsInput(event.target.value)}
              onBlur={() => {
                const next = Math.max(1, Number.parseInt(guestsInput, 10) || 1);
                setGuestsInput(String(next));
                if (next !== filters.guests) patchAndApply({ guests: next });
              }}
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">{t('price_per_night_range')}</label>
            <Slider
              min={0}
              max={sliderMax}
              step={sliderStep}
              value={priceRange}
              onValueChange={(values) => setPriceRange([values[0] ?? 0, values[1] ?? sliderMax])}
              onValueCommit={handlePriceCommit}
            />
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{formatCurrencyAmount(priceRange[0] ?? 0, displayCurrency)}</span>
              <span>
                {t('price_up_to', {
                  amount: formatCurrencyAmount(priceRange[1] ?? sliderMax, displayCurrency),
                })}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('property_type')}</p>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPE_OPTIONS.map((type) => {
                const active = filters.propertyType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => patchAndApply({ propertyType: active ? undefined : type })}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    {tc(propertyTypeLabelKey(type))}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('min_bedrooms')}</p>
            <div className="flex flex-wrap gap-2">
              {ROOM_OPTIONS.map((value) => {
                const active = filters.minBedrooms === value;
                const label =
                  value === undefined ? t('bedrooms_any') : t('bedrooms_plus', { count: value });
                return (
                  <button
                    key={`bed-${label}`}
                    type="button"
                    onClick={() => patchAndApply({ minBedrooms: value })}
                    className={cn(
                      'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('min_bathrooms')}</p>
            <div className="flex flex-wrap gap-2">
              {ROOM_OPTIONS.map((value) => {
                const active = filters.minBathrooms === value;
                const label =
                  value === undefined ? t('bathrooms_any') : t('bathrooms_plus', { count: value });
                return (
                  <button
                    key={`bath-${label}`}
                    type="button"
                    onClick={() => patchAndApply({ minBathrooms: value })}
                    className={cn(
                      'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMoreFiltersOpen(!isMoreFiltersOpen)}
            className="inline-flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('more_filters')}
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', isMoreFiltersOpen && 'rotate-180')}
            />
          </button>
          {isMoreFiltersOpen ? (
            <div className="space-y-5 border-t border-border pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('min_beds')}</p>
                <div className="flex flex-wrap gap-2">
                  {ROOM_OPTIONS.map((value) => {
                    const active = filters.minBeds === value;
                    const label =
                      value === undefined ? t('beds_any') : t('beds_plus', { count: value });
                    return (
                      <button
                        key={`beds-${label}`}
                        type="button"
                        onClick={() => patchAndApply({ minBeds: value })}
                        className={cn(
                          'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground hover:bg-muted',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <RatingFilter
                value={filters.minAvgRating}
                onChange={(minAvgRating) => setFilters({ minAvgRating })}
              />
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('house_rules')}</p>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>{t('smoking_allowed')}</span>
                  <Switch
                    checked={filters.smokingAllowed === true}
                    onCheckedChange={(checked) =>
                      setFilters({ smokingAllowed: checked ? true : undefined })
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>{t('pets_allowed')}</span>
                  <Switch
                    checked={filters.petsAllowed === true}
                    onCheckedChange={(checked) =>
                      setFilters({ petsAllowed: checked ? true : undefined })
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>{t('parties_allowed')}</span>
                  <Switch
                    checked={filters.partiesAllowed === true}
                    onCheckedChange={(checked) =>
                      setFilters({ partiesAllowed: checked ? true : undefined })
                    }
                  />
                </label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{t('amenities')}</p>
                  <Input
                    value={amenityQuery}
                    onChange={(e) => setAmenityQuery(e.target.value)}
                    placeholder={t('amenities_search')}
                    className="h-8 w-36 text-xs"
                  />
                </div>
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-auto rounded-md border border-border p-3">
                  {visibleAmenities.map((a) => {
                    const checked = filters.amenities.includes(a.name);
                    return (
                      <label key={a.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const nextChecked = next === true;
                            setFilters({
                              amenities: nextChecked
                                ? Array.from(new Set([...filters.amenities, a.name]))
                                : filters.amenities.filter((n) => n !== a.name),
                            });
                          }}
                        />
                        {a.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleReset}>
                  {t('reset')}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() =>
                    apply({
                      ...filters,
                      displayCurrency: filters.displayCurrency ?? displayCurrency,
                      aiMatch: false,
                    })
                  }
                >
                  {t('apply')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
