import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { DEFAULT_SEARCH_FILTERS, type SearchFilters } from '@/hooks/use-search-filters';

interface SearchState {
  filters: SearchFilters;
  isAdvancedOpen: boolean;
}

interface SearchActions {
  hydrateFromUrlFilters: (filters: SearchFilters) => void;
  setFilters: (partial: Partial<SearchFilters>) => void;
  setAdvancedOpen: (open: boolean) => void;
  resetAdvanced: () => void;
}

export const useSearchStore = create<SearchState & SearchActions>()(
  devtools(
    (set, get) => ({
      filters: DEFAULT_SEARCH_FILTERS,
      isAdvancedOpen: false,
      hydrateFromUrlFilters: (filters) => set({ filters }),
      setFilters: (partial) => {
        const { filters } = get();
        set({ filters: { ...filters, ...partial } });
      },
      setAdvancedOpen: (open) => set({ isAdvancedOpen: open }),
      resetAdvanced: () => {
        const { location, checkIn, checkOut, guests, sortBy } = get().filters;
        set({
          filters: {
            ...DEFAULT_SEARCH_FILTERS,
            location,
            checkIn,
            checkOut,
            guests,
            sortBy,
          },
        });
      },
    }),
    { name: 'search-store' },
  ),
);
