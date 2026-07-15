import type { PropertySummary } from '@repo/shared';

import type { SearchFilters } from '@/hooks/use-search-filters';

import { AiSearchSection } from './ai-search-section';
import { FiltersSidebar } from './filters-sidebar';
import { SearchResults } from './search-results';
import { SearchToolbar } from './search-toolbar';

interface SearchPageViewProps {
  filters: SearchFilters;
  properties: PropertySummary[];
  total: number;
  geoCurrency?: string;
}

export function SearchPageView({
  filters,
  properties,
  total,
  geoCurrency,
}: SearchPageViewProps): React.JSX.Element {
  const displayCurrency =
    filters.displayCurrency || geoCurrency || properties[0]?.displayPrice?.currency || 'AMD';
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AiSearchSection filters={filters} total={total} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <FiltersSidebar initialFilters={filters} displayCurrency={displayCurrency} />
        <div className="min-w-0 flex-1">
          <SearchToolbar
            total={total}
            filters={filters}
            geoCurrency={geoCurrency ?? displayCurrency}
          />
          <SearchResults properties={properties} showAiMatch={Boolean(filters.aiMatch)} />
        </div>
      </div>
    </div>
  );
}
