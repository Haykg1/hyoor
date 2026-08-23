'use client';

import { useEffect } from 'react';

import { useAdminBookingsStore } from '@/store/admin-bookings.store';

const SEARCH_DEBOUNCE_MS = 300;

export function useAdminBookings() {
  const {
    bookings,
    page,
    limit,
    total,
    totalPages,
    status,
    paymentStatus,
    propertyId,
    guestId,
    hostId,
    from,
    to,
    searchQuery,
    isLoading,
    error,
    actionId,
    fetchBookings,
    setPage,
    setStatus,
    setPaymentStatus,
    setSearchQuery,
    setPropertyId,
    setGuestId,
    setHostId,
    setFrom,
    setTo,
    resetFilters,
  } = useAdminBookingsStore();

  useEffect(() => {
    void fetchBookings();
  }, [page, status, paymentStatus, propertyId, guestId, hostId, from, to, fetchBookings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBookings();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery, fetchBookings]);

  return {
    bookings,
    page,
    limit,
    total,
    totalPages,
    status,
    paymentStatus,
    propertyId,
    guestId,
    hostId,
    from,
    to,
    searchQuery,
    isLoading,
    error,
    actionId,
    setPage,
    setStatus,
    setPaymentStatus,
    setSearchQuery,
    setPropertyId,
    setGuestId,
    setHostId,
    setFrom,
    setTo,
    resetFilters,
    fetchBookings,
  };
}
