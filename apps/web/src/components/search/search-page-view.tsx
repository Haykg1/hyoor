import type { PropertySummary } from '@repo/shared';

import type { SearchFilters } from '@/hooks/use-search-filters';

import { SearchFormBar } from './search-form-bar';
import { SearchResults } from './search-results';
import { SearchToolbar } from './search-toolbar';

interface SearchPageViewProps {
  filters: SearchFilters;
  properties: PropertySummary[];
  total: number;
}

export function SearchPageView({
  filters,
  properties,
  total,
}: SearchPageViewProps): React.JSX.Element {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <SearchFormBar initialFilters={filters} />
      <SearchToolbar total={total} filters={filters} />
      <SearchResults properties={properties} />
    </div>
  );
}
