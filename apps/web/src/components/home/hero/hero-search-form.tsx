'use client';

import type { PlaceResult } from '@repo/shared';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { PlaceAutocomplete } from '@/components/search/place-autocomplete';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { placeResultToLocationFilters, type LocationFilters } from '@/lib/search/place-to-filters';

export function HeroSearchForm(): React.JSX.Element {
  const t = useTranslations('home.hero');
  const { goToSearch } = useSearchNavigation();
  const [query, setQuery] = useState('');
  const [placeFilters, setPlaceFilters] = useState<LocationFilters | null>(null);

  function handleChange(value: string): void {
    setQuery(value);
    if (placeFilters && value !== placeFilters.location) {
      setPlaceFilters(null);
    }
  }

  function handleSelectPlace(place: PlaceResult): void {
    setPlaceFilters(placeResultToLocationFilters(place));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (placeFilters) {
      goToSearch(placeFilters);
      return;
    }
    goToSearch({ location: query.trim() || undefined });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-3 shadow-2xl sm:flex-row"
    >
      <div className="flex-1">
        <PlaceAutocomplete
          value={query}
          onChange={handleChange}
          onSelectPlace={handleSelectPlace}
          placeholder={t('search_placeholder')}
          level="any"
          inputClassName="h-11 border-0 bg-transparent text-base font-medium text-neutral-900 shadow-none placeholder:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Search className="h-4 w-4" aria-hidden />
        {t('search_button')}
      </button>
    </form>
  );
}
