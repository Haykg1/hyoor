import type { HostDashboardStats, HostListingTab, HostListingSummary } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { deleteProperty, listMyProperties } from '@/lib/api/properties';

type PageSize = 10 | 20 | 30;

interface HostListingsState {
  listings: HostListingSummary[];
  stats: HostDashboardStats;
  page: number;
  limit: PageSize;
  total: number;
  totalPages: number;
  tab: HostListingTab;
  isLoading: boolean;
  error: string | null;
}

interface HostListingsActions {
  fetchListings: () => Promise<void>;
  setPage: (page: number) => void;
  setLimit: (limit: PageSize) => void;
  setTab: (tab: HostListingTab) => void;
  softDeleteListing: (id: string) => Promise<void>;
}

const DEFAULT_STATS: HostDashboardStats = {
  totalListings: 0,
  activeListings: 0,
  pendingRequests: 0,
  totalEarnings: 0,
};

export const useHostListingsStore = create<HostListingsState & HostListingsActions>()(
  devtools(
    (set, get) => ({
      listings: [],
      stats: DEFAULT_STATS,
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      tab: 'active',
      isLoading: false,
      error: null,

      fetchListings: async () => {
        const { page, limit, tab } = get();
        set({ isLoading: true, error: null });
        try {
          const res = await listMyProperties({ page, limit, tab });
          set({
            listings: res.data,
            stats: res.stats,
            total: res.total,
            totalPages: res.totalPages,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false, error: 'Failed to load listings' });
        }
      },

      setPage: (page) => set({ page }),

      setLimit: (limit) => set({ limit, page: 1 }),

      setTab: (tab) => set({ tab, page: 1 }),

      softDeleteListing: async (id) => {
        await deleteProperty(id);
        await get().fetchListings();
      },
    }),
    { name: 'host-listings-store' },
  ),
);
