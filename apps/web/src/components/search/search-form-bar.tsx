'use client';

import type { PlaceResult } from '@repo/shared';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { PlaceAutocomplete } from '@/components/search/place-autocomplete';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { SearchFilters } from '@/hooks/use-search-filters';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
import {
  filtersToLocationFilters,
  placeResultToLocationFilters,
  type LocationFilters,
} from '@/lib/search/place-to-filters';

interface SearchFormBarProps {
  initialFilters: SearchFilters;
}

export function SearchFormBar({ initialFilters }: SearchFormBarProps): React.JSX.Element {
  const t = useTranslations('search');
  const { goToSearch } = useSearchNavigation();
  const [location, setLocation] = useState(initialFilters.location);
  const [placeFilters, setPlaceFilters] = useState<LocationFilters | null>(() =>
    filtersToLocationFilters(initialFilters),
  );
  const [checkIn, setCheckIn] = useState(initialFilters.checkIn);
  const [checkOut, setCheckOut] = useState(initialFilters.checkOut);
  const [guests, setGuests] = useState(initialFilters.guests);

  function handleLocationChange(value: string): void {
    setLocation(value);
    if (placeFilters && value !== placeFilters.location) {
      setPlaceFilters(null);
    }
  }

  function handleSelectPlace(place: PlaceResult): void {
    setPlaceFilters(placeResultToLocationFilters(place));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const locationParams = placeFilters ?? { location: location.trim() || undefined };
    goToSearch({
      ...locationParams,
      checkIn,
      checkOut,
      guests,
      sortBy: initialFilters.sortBy,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-col gap-3 sm:flex-row"
      aria-label={t('search_button')}
    >
      <div className="flex-1">
        <PlaceAutocomplete
          value={location}
          onChange={handleLocationChange}
          onSelectPlace={handleSelectPlace}
          placeholder={t('destination_placeholder')}
          level="any"
        />
      </div>

      <div className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 shadow-sm sm:w-64">
        <DateRangePicker
          from={checkIn}
          to={checkOut}
          placeholder={`${t('check_in')} – ${t('check_out')}`}
          numberOfMonths={2}
          align="start"
          onSelect={(from, to) => {
            setCheckIn(from);
            setCheckOut(to);
          }}
          triggerClassName="text-sm w-full"
        />
      </div>

      <input
        type="number"
        min={1}
        value={guests}
        onChange={(event) => setGuests(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
        aria-label={t('guests')}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-24"
      />

      <button
        type="submit"
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Search className="h-4 w-4" aria-hidden />
        {t('search_button')}
      </button>
    </form>
  );
}
