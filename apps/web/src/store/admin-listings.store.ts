import type {
  HostDashboardStats,
  HostListingSummary,
  HostListingTab,
  PropertyType,
} from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  listAdminProperties,
  updateAdminPropertyStatus,
  type AdminListingStatusFilter,
} from '@/lib/api/admin';

interface AdminListingsState {
  listings: HostListingSummary[];
  stats: HostDashboardStats;
  page: number;
  limit: 10 | 20 | 30;
  total: number;
  totalPages: number;
  tab: HostListingTab;
  statusFilter: AdminListingStatusFilter | null;
  propertyTypeFilter: PropertyType | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

interface AdminListingsActions {
  fetchListings: () => Promise<void>;
  setPage: (page: number) => void;
  setLimit: (limit: 10 | 20 | 30) => void;
  setTab: (tab: HostListingTab) => void;
  setStatusFilter: (status: AdminListingStatusFilter | null) => void;
  setPropertyTypeFilter: (type: PropertyType | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  disableListing: (id: string) => Promise<void>;
  enableListing: (id: string) => Promise<void>;
}

const DEFAULT_STATS: HostDashboardStats = {
  totalListings: 0,
  activeListings: 0,
  pendingRequests: 0,
  totalEarnings: 0,
};

export const useAdminListingsStore = create<AdminListingsState & AdminListingsActions>()(
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
          const res = await listAdminProperties({
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
          set({ isLoading: false, error: 'Failed to load properties' });
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
      disableListing: async (id) => {
        await updateAdminPropertyStatus(id, 'INACTIVE');
        await get().fetchListings();
      },
      enableListing: async (id) => {
        await updateAdminPropertyStatus(id, 'ACTIVE');
        await get().fetchListings();
      },
    }),
    { name: 'admin-listings-store' },
  ),
);
