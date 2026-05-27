'use client';

import { MapPin, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';

import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { ARMENIAN_CITIES } from '@/lib/constants/armenian-cities';

export function HeroSearchForm(): React.JSX.Element {
  const t = useTranslations('home.hero');
  const { goToSearch } = useSearchNavigation();
  const [query, setQuery] = useState('');
  const datalistId = useId();
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    goToSearch({ location: query });
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-3 shadow-2xl sm:flex-row"
    >
      <div className="flex flex-1 items-center gap-2 px-3">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <input
          type="text"
          name="location"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('search_placeholder')}
          list={datalistId}
          aria-label={t('search_placeholder')}
          className="h-9 w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
        />
        <datalist id={datalistId}>
          {ARMENIAN_CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
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
