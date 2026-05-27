'use client';

import type { PropertySummary } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { PropertyCard } from '@/components/property';
import { useSearchNavigation } from '@/hooks/use-search-navigation';

interface SearchResultsProps {
  properties: PropertySummary[];
}

export function SearchResults({ properties }: SearchResultsProps): React.JSX.Element {
  const t = useTranslations('search.empty');
  const { goToSearch } = useSearchNavigation();
  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 px-6 py-14 text-center">
        <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
        <button
          type="button"
          onClick={() => goToSearch()}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          {t('clear')}
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
