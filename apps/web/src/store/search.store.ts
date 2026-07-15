import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { DEFAULT_SEARCH_FILTERS, type SearchFilters } from '@/hooks/use-search-filters';

interface SearchState {
  filters: SearchFilters;
  isFiltersOpen: boolean;
  isMoreFiltersOpen: boolean;
  aiPrompt: string;
  aiInterpretation: string | null;
}

interface SearchActions {
  hydrateFromUrlFilters: (filters: SearchFilters) => void;
  setFilters: (partial: Partial<SearchFilters>) => void;
  setFiltersOpen: (open: boolean) => void;
  setMoreFiltersOpen: (open: boolean) => void;
  setAiPrompt: (prompt: string) => void;
  setAiInterpretation: (text: string | null) => void;
  resetAdvanced: () => void;
}

export const useSearchStore = create<SearchState & SearchActions>()(
  devtools(
    (set, get) => ({
      filters: DEFAULT_SEARCH_FILTERS,
      isFiltersOpen: true,
      isMoreFiltersOpen: false,
      aiPrompt: '',
      aiInterpretation: null,
      hydrateFromUrlFilters: (filters) => set({ filters }),
      setFilters: (partial) => {
        const { filters } = get();
        set({ filters: { ...filters, ...partial } });
      },
      setFiltersOpen: (open) => set({ isFiltersOpen: open }),
      setMoreFiltersOpen: (open) => set({ isMoreFiltersOpen: open }),
      setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
      setAiInterpretation: (text) => set({ aiInterpretation: text }),
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
