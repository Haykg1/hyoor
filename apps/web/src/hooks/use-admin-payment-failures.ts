'use client';

import { useEffect } from 'react';

import { useAdminPaymentFailuresStore } from '@/store/admin-payment-failures.store';

const SEARCH_DEBOUNCE_MS = 300;

export function useAdminPaymentFailures() {
  const {
    failures,
    page,
    limit,
    total,
    totalPages,
    bookingId,
    propertyId,
    hostId,
    guestId,
    category,
    resolved,
    searchQuery,
    isLoading,
    error,
    fetchFailures,
    setPage,
    setCategory,
    setResolved,
    setSearchQuery,
    setBookingId,
    setPropertyId,
    setHostId,
    setGuestId,
    resetFilters,
    resolveFailure,
    resolveFailures,
  } = useAdminPaymentFailuresStore();

  useEffect(() => {
    void fetchFailures();
  }, [page, category, resolved, bookingId, propertyId, hostId, guestId, fetchFailures]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchFailures();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery, fetchFailures]);

  return {
    failures,
    page,
    limit,
    total,
    totalPages,
    bookingId,
    propertyId,
    hostId,
    guestId,
    category,
    resolved,
    searchQuery,
    isLoading,
    error,
    setPage,
    setCategory,
    setResolved,
    setSearchQuery,
    setBookingId,
    setPropertyId,
    setHostId,
    setGuestId,
    resetFilters,
    resolveFailure,
    resolveFailures,
  };
}
