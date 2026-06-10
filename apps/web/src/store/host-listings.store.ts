import type {
  HostDashboardStats,
  HostListingTab,
  HostListingSummary,
  PropertyType,
} from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  deleteProperty,
  listMyProperties,
  reactivateProperty,
  type HostListingStatusFilter,
} from '@/lib/api/properties';

type PageSize = 10 | 20 | 30;

interface HostListingsState {
  listings: HostListingSummary[];
  stats: HostDashboardStats;
  page: number;
  limit: PageSize;
  total: number;
  totalPages: number;
  tab: HostListingTab;
  statusFilter: HostListingStatusFilter | null;
  propertyTypeFilter: PropertyType | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

interface HostListingsActions {
  fetchListings: () => Promise<void>;
  setPage: (page: number) => void;
  setLimit: (limit: PageSize) => void;
  setTab: (tab: HostListingTab) => void;
  setStatusFilter: (status: HostListingStatusFilter | null) => void;
  setPropertyTypeFilter: (type: PropertyType | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  softDeleteListing: (id: string) => Promise<void>;
  reactivateListing: (id: string) => Promise<void>;
}

const DEFAULT_STATS: HostDashboardStats = {
  totalListings: 0,
  activeListings: 0,
  pendingRequests: 0,
  upcomingReservations: 0,
  pastReservations: 0,
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
      statusFilter: null,
      propertyTypeFilter: null,
      searchQuery: '',
      isLoading: false,
      error: null,

      fetchListings: async () => {
        const { page, limit, tab, statusFilter, propertyTypeFilter, searchQuery } = get();
        set({ isLoading: true, error: null });
        try {
          const res = await listMyProperties({
            page,
            limit,
            tab,
            status: tab === 'active' && statusFilter ? statusFilter : undefined,
            propertyType: propertyTypeFilter ?? undefined,
            search: searchQuery.trim() || undefined,
          });
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

      setTab: (tab) => set({ tab, page: 1, statusFilter: null }),

      setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),

      setPropertyTypeFilter: (propertyTypeFilter) => set({ propertyTypeFilter, page: 1 }),

      setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),

      resetFilters: () =>
        set({ statusFilter: null, propertyTypeFilter: null, searchQuery: '', page: 1 }),

      softDeleteListing: async (id) => {
        await deleteProperty(id);
        await get().fetchListings();
      },

      reactivateListing: async (id) => {
        await reactivateProperty(id);
        await get().fetchListings();
      },
    }),
    { name: 'host-listings-store' },
  ),
);
