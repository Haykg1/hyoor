'use client';

import { useEffect } from 'react';

import { useHostListingsStore } from '@/store/host-listings.store';

const SEARCH_DEBOUNCE_MS = 300;

export function useHostListings() {
  const {
    listings,
    stats,
    page,
    limit,
    total,
    totalPages,
    tab,
    statusFilter,
    propertyTypeFilter,
    searchQuery,
    isLoading,
    error,
    fetchListings,
    setPage,
    setLimit,
    setTab,
    setStatusFilter,
    setPropertyTypeFilter,
    setSearchQuery,
    resetFilters,
    softDeleteListing,
    reactivateListing,
  } = useHostListingsStore();

  useEffect(() => {
    void fetchListings();
  }, [page, limit, tab, statusFilter, propertyTypeFilter, fetchListings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchListings();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery, fetchListings]);

  return {
    listings,
    stats,
    page,
    limit,
    total,
    totalPages,
    tab,
    statusFilter,
    propertyTypeFilter,
    searchQuery,
    isLoading,
    error,
    setTab,
    setLimit,
    setPage,
    setStatusFilter,
    setPropertyTypeFilter,
    setSearchQuery,
    resetFilters,
    softDeleteListing,
    reactivateListing,
  };
}
