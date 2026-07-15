import { setRequestLocale } from 'next-intl/server';

import { SearchPageView } from '@/components/search';
import { filtersToApiParams, parseSearchFilters } from '@/hooks/use-search-filters';
import type { Locale } from '@/i18n/routing';
import { getDisplayCurrencyDefault } from '@/lib/api/currency';
import { searchProperties } from '@/lib/api/properties';

interface SearchPageProps {
  params: { locale: Locale };
  searchParams: Record<string, string | string[] | undefined>;
}

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  params: { locale },
  searchParams,
}: SearchPageProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const filters = parseSearchFilters(searchParams);
  const geoCurrency = filters.displayCurrency ?? (await getDisplayCurrencyDefault());
  const result = await searchProperties({
    ...filtersToApiParams(filters),
    displayCurrency: geoCurrency,
    limit: 24,
  });
  return (
    <SearchPageView
      filters={filters}
      properties={result.data}
      total={result.total}
      geoCurrency={geoCurrency}
    />
  );
}
