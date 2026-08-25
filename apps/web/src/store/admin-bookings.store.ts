import type { AdminBooking, BookingStatus, PaymentStatus } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { listAdminBookings } from '@/lib/api/admin-bookings';

interface AdminBookingsState {
  bookings: AdminBooking[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  status: BookingStatus | null;
  paymentStatus: PaymentStatus | null;
  propertyId: string;
  guestId: string;
  hostId: string;
  from: string;
  to: string;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

interface AdminBookingsActions {
  fetchBookings: () => Promise<void>;
  setPage: (page: number) => void;
  setStatus: (status: BookingStatus | null) => void;
  setPaymentStatus: (paymentStatus: PaymentStatus | null) => void;
  setSearchQuery: (query: string) => void;
  setPropertyId: (value: string) => void;
  setGuestId: (value: string) => void;
  setHostId: (value: string) => void;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  resetFilters: () => void;
}

const PAGE_SIZE = 20;

export const useAdminBookingsStore = create<AdminBookingsState & AdminBookingsActions>()(
  devtools(
    (set, get) => ({
      bookings: [],
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 1,
      status: null,
      paymentStatus: null,
      propertyId: '',
      guestId: '',
      hostId: '',
      from: '',
      to: '',
      searchQuery: '',
      isLoading: false,
      error: null,
      actionId: null,
      fetchBookings: async () => {
        const {
          page,
          limit,
          status,
          paymentStatus,
          propertyId,
          guestId,
          hostId,
          from,
          to,
          searchQuery,
        } = get();
        set({ isLoading: true, error: null });
        try {
          const res = await listAdminBookings({
            page,
            limit,
            status: status ?? undefined,
            paymentStatus: paymentStatus ?? undefined,
            propertyId: propertyId.trim() || undefined,
            guestId: guestId.trim() || undefined,
            hostId: hostId.trim() || undefined,
            from: from.trim() || undefined,
            to: to.trim() || undefined,
            search: searchQuery.trim() || undefined,
          });
          set({
            bookings: res.data,
            total: res.total,
            totalPages: res.totalPages,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false, error: 'Failed to load bookings' });
        }
      },
      setPage: (page) => set({ page }),
      setStatus: (status) => set({ status, page: 1 }),
      setPaymentStatus: (paymentStatus) => set({ paymentStatus, page: 1 }),
      setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
      setPropertyId: (propertyId) => set({ propertyId, page: 1 }),
      setGuestId: (guestId) => set({ guestId, page: 1 }),
      setHostId: (hostId) => set({ hostId, page: 1 }),
      setFrom: (from) => set({ from, page: 1 }),
      setTo: (to) => set({ to, page: 1 }),
      resetFilters: () =>
        set({
          status: null,
          paymentStatus: null,
          propertyId: '',
          guestId: '',
          hostId: '',
          from: '',
          to: '',
          searchQuery: '',
          page: 1,
        }),
    }),
    { name: 'admin-bookings-store' },
  ),
);
