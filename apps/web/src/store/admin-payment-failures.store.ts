import type { AdminPaymentFailure, PaymentFailureCategory } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  listPaymentFailures,
  resolvePaymentFailure,
  resolvePaymentFailures,
} from '@/lib/api/payment-failures';

interface AdminPaymentFailuresState {
  failures: AdminPaymentFailure[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  bookingId: string;
  propertyId: string;
  hostId: string;
  guestId: string;
  category: PaymentFailureCategory | null;
  resolved: boolean | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

interface AdminPaymentFailuresActions {
  fetchFailures: () => Promise<void>;
  setPage: (page: number) => void;
  setCategory: (category: PaymentFailureCategory | null) => void;
  setResolved: (resolved: boolean | null) => void;
  setSearchQuery: (query: string) => void;
  setBookingId: (value: string) => void;
  setPropertyId: (value: string) => void;
  setHostId: (value: string) => void;
  setGuestId: (value: string) => void;
  resetFilters: () => void;
  resolveFailure: (id: string) => Promise<void>;
  resolveFailures: (ids: string[]) => Promise<void>;
}

const PAGE_SIZE = 20;

export const useAdminPaymentFailuresStore = create<
  AdminPaymentFailuresState & AdminPaymentFailuresActions
>()(
  devtools(
    (set, get) => ({
      failures: [],
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 1,
      bookingId: '',
      propertyId: '',
      hostId: '',
      guestId: '',
      category: null,
      resolved: null,
      searchQuery: '',
      isLoading: false,
      error: null,
      fetchFailures: async () => {
        const {
          page,
          limit,
          bookingId,
          propertyId,
          hostId,
          guestId,
          category,
          resolved,
          searchQuery,
        } = get();
        set({ isLoading: true, error: null });
        try {
          const res = await listPaymentFailures({
            page,
            limit,
            bookingId: bookingId.trim() || undefined,
            propertyId: propertyId.trim() || undefined,
            hostId: hostId.trim() || undefined,
            guestId: guestId.trim() || undefined,
            category: category ?? undefined,
            resolved: resolved ?? undefined,
            search: searchQuery.trim() || undefined,
          });
          set({
            failures: res.data,
            total: res.total,
            totalPages: res.totalPages,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false, error: 'Failed to load payment failures' });
        }
      },
      setPage: (page) => set({ page }),
      setCategory: (category) => set({ category, page: 1 }),
      setResolved: (resolved) => set({ resolved, page: 1 }),
      setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
      setBookingId: (bookingId) => set({ bookingId, page: 1 }),
      setPropertyId: (propertyId) => set({ propertyId, page: 1 }),
      setHostId: (hostId) => set({ hostId, page: 1 }),
      setGuestId: (guestId) => set({ guestId, page: 1 }),
      resetFilters: () =>
        set({
          bookingId: '',
          propertyId: '',
          hostId: '',
          guestId: '',
          category: null,
          resolved: null,
          searchQuery: '',
          page: 1,
        }),
      resolveFailure: async (id) => {
        await resolvePaymentFailure(id);
        await get().fetchFailures();
      },
      resolveFailures: async (ids) => {
        await resolvePaymentFailures(ids);
        await get().fetchFailures();
      },
    }),
    { name: 'admin-payment-failures-store' },
  ),
);
