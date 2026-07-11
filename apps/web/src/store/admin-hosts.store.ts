import type { AdminHost } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { listAdminHosts, updateHostPlatformFee } from '@/lib/api/admin-hosts';

interface AdminHostsState {
  hosts: AdminHost[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  searchQuery: string;
  hostType: 'INDIVIDUAL' | 'COMPANY' | null;
  isVerified: boolean | null;
  hasFeeOverride: boolean | null;
  isLoading: boolean;
  error: string | null;
  savingId: string | null;
}

interface AdminHostsActions {
  fetchHosts: () => Promise<void>;
  setPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  setHostType: (hostType: 'INDIVIDUAL' | 'COMPANY' | null) => void;
  setIsVerified: (isVerified: boolean | null) => void;
  setHasFeeOverride: (hasFeeOverride: boolean | null) => void;
  resetFilters: () => void;
  savePlatformFee: (hostId: string, platformFeePercent: number | null) => Promise<void>;
}

const PAGE_SIZE = 20;

export const useAdminHostsStore = create<AdminHostsState & AdminHostsActions>()(
  devtools(
    (set, get) => ({
      hosts: [],
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 1,
      searchQuery: '',
      hostType: null,
      isVerified: null,
      hasFeeOverride: null,
      isLoading: false,
      error: null,
      savingId: null,
      fetchHosts: async () => {
        const { page, limit, searchQuery, hostType, isVerified, hasFeeOverride } = get();
        set({ isLoading: true, error: null });
        try {
          const res = await listAdminHosts({
            page,
            limit,
            search: searchQuery.trim() || undefined,
            hostType: hostType ?? undefined,
            isVerified: isVerified ?? undefined,
            hasFeeOverride: hasFeeOverride ?? undefined,
          });
          set({
            hosts: res.data,
            total: res.total,
            totalPages: res.totalPages,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false, error: 'Failed to load hosts' });
        }
      },
      setPage: (page) => set({ page }),
      setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
      setHostType: (hostType) => set({ hostType, page: 1 }),
      setIsVerified: (isVerified) => set({ isVerified, page: 1 }),
      setHasFeeOverride: (hasFeeOverride) => set({ hasFeeOverride, page: 1 }),
      resetFilters: () =>
        set({
          searchQuery: '',
          hostType: null,
          isVerified: null,
          hasFeeOverride: null,
          page: 1,
        }),
      savePlatformFee: async (hostId, platformFeePercent) => {
        set({ savingId: hostId });
        try {
          const updated = await updateHostPlatformFee(hostId, platformFeePercent);
          set((state) => ({
            hosts: state.hosts.map((h) => (h.id === hostId ? updated : h)),
            savingId: null,
          }));
        } catch {
          set({ savingId: null });
          throw new Error('Failed to update platform fee');
        }
      },
    }),
    { name: 'admin-hosts-store' },
  ),
);
