'use client';

import type { AiSearchExtractedFilters } from '@repo/shared';
import { ChevronUp, Loader2, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAiSearchUpdate } from '@/hooks/use-ai-search-update';
import type { SearchFilters } from '@/hooks/use-search-filters';
import {
  searchFiltersToNavigationParams,
  useSearchNavigation,
} from '@/hooks/use-search-navigation';
import { extractedFiltersToChips } from '@/lib/ai-search/filters-display';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/store/search.store';

interface AiSearchSectionProps {
  filters: SearchFilters;
  total: number;
}

function filtersToChipSource(filters: SearchFilters): AiSearchExtractedFilters {
  return {
    locationLabel: filters.location || filters.searchCity || filters.region || undefined,
    searchCity: filters.searchCity,
    region: filters.region || undefined,
    checkIn: filters.checkIn || undefined,
    checkOut: filters.checkOut || undefined,
    guests: filters.guests > 1 ? filters.guests : undefined,
    minBedrooms: filters.minBedrooms,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    propertyType: filters.propertyType,
    amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
    petsAllowed: filters.petsAllowed,
    smokingAllowed: filters.smokingAllowed,
    partiesAllowed: filters.partiesAllowed,
    minAvgRating: filters.minAvgRating,
  };
}

function clearChipFromFilters(filters: SearchFilters, chipKey: string): SearchFilters {
  if (chipKey === 'location') {
    return {
      ...filters,
      location: '',
      region: '',
      searchCity: undefined,
      searchStreet: undefined,
      searchBuildingNumber: undefined,
      searchPlaceKind: undefined,
      searchLatitude: undefined,
      searchLongitude: undefined,
      aiMatch: false,
    };
  }
  if (chipKey === 'dates') {
    return { ...filters, checkIn: '', checkOut: '', aiMatch: false };
  }
  if (chipKey === 'guests') {
    return { ...filters, guests: 1, aiMatch: false };
  }
  if (chipKey === 'bedrooms') {
    return { ...filters, minBedrooms: undefined, aiMatch: false };
  }
  if (chipKey === 'price') {
    return { ...filters, minPrice: undefined, maxPrice: undefined, aiMatch: false };
  }
  if (chipKey === 'type') {
    return { ...filters, propertyType: undefined, aiMatch: false };
  }
  if (chipKey === 'pets') {
    return { ...filters, petsAllowed: undefined, aiMatch: false };
  }
  if (chipKey === 'smoking') {
    return { ...filters, smokingAllowed: undefined, aiMatch: false };
  }
  if (chipKey === 'parties') {
    return { ...filters, partiesAllowed: undefined, aiMatch: false };
  }
  if (chipKey === 'rating') {
    return { ...filters, minAvgRating: undefined, aiMatch: false };
  }
  if (chipKey.startsWith('amenity-')) {
    const name = chipKey.slice('amenity-'.length);
    return {
      ...filters,
      amenities: filters.amenities.filter((a) => a !== name),
      aiMatch: false,
    };
  }
  return { ...filters, aiMatch: false };
}

export function AiSearchSection({
  filters,
  total: _total,
}: AiSearchSectionProps): React.JSX.Element {
  const t = useTranslations('search');
  const { goToSearch } = useSearchNavigation();
  const { isLoading, runUpdate } = useAiSearchUpdate();
  const aiPrompt = useSearchStore((s) => s.aiPrompt);
  const setAiPrompt = useSearchStore((s) => s.setAiPrompt);
  const aiInterpretation = useSearchStore((s) => s.aiInterpretation);
  const setAiInterpretation = useSearchStore((s) => s.setAiInterpretation);
  const [collapsed, setCollapsed] = useState(false);
  const chips = useMemo(
    () =>
      extractedFiltersToChips(filtersToChipSource(filters), {
        displayCurrency: filters.displayCurrency,
      }),
    [filters],
  );
  useEffect(() => {
    if (!aiInterpretation && filters.aiMatch && chips.length > 0) {
      setAiInterpretation(t('ai_interpreted_fallback'));
    }
  }, [aiInterpretation, chips.length, filters.aiMatch, setAiInterpretation, t]);
  async function handleUpdate(): Promise<void> {
    const response = await runUpdate(aiPrompt);
    if (!response) return;
    if (response.message) {
      setAiInterpretation(response.message);
    }
  }
  function handleRemoveChip(chipKey: string): void {
    goToSearch(searchFiltersToNavigationParams(clearChipFromFilters(filters, chipKey)));
  }
  return (
    <section
      className={cn(
        'mb-6 rounded-2xl border border-border/60 bg-muted/40 transition-[padding] duration-500 ease-in-out',
        collapsed ? 'px-4 py-2.5 sm:px-5' : 'p-4 sm:p-5',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 transition-[margin] duration-500 ease-in-out',
          collapsed ? 'mb-0' : 'mb-3',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            {t('ai_section_title')}
          </p>
          {/* <span className="text-sm text-muted-foreground">
            {t('ai_results_count', { count: total })}
          </span> */}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('ai_expand') : t('ai_collapse')}
        >
          <ChevronUp
            className={cn(
              'h-4 w-4 transition-transform duration-500 ease-in-out',
              collapsed && 'rotate-180',
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out',
          collapsed
            ? 'pointer-events-none max-h-0 opacity-0'
            : 'pointer-events-auto max-h-[32rem] opacity-100',
        )}
        aria-hidden={collapsed}
      >
        {aiInterpretation ? (
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t('ai_interpreted_as')} </span>
            {aiInterpretation}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Sparkles
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  void handleUpdate();
                }
              }}
              placeholder={t('ai_prompt_placeholder')}
              className="h-11 bg-background pl-9"
              disabled={isLoading || collapsed}
              tabIndex={collapsed ? -1 : 0}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleUpdate()}
            disabled={isLoading || !aiPrompt.trim() || collapsed}
            tabIndex={collapsed ? -1 : 0}
            className="h-11 shrink-0 sm:w-28"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('ai_update')}
          </Button>
        </div>
        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => handleRemoveChip(chip.key)}
                tabIndex={collapsed ? -1 : 0}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                {chip.label}
                <X className="h-3 w-3 text-muted-foreground" aria-hidden />
                <span className="sr-only">{t('ai_remove_chip')}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
