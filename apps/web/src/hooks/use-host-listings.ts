'use client';

import { useEffect, useRef } from 'react';

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
  const prevSearchQuery = useRef(searchQuery);
  useEffect(() => {
    const searchChanged = prevSearchQuery.current !== searchQuery;
    prevSearchQuery.current = searchQuery;
    const delay = searchChanged && searchQuery.trim() !== '' ? SEARCH_DEBOUNCE_MS : 0;
    const timer = window.setTimeout(() => {
      void fetchListings();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [page, limit, tab, statusFilter, propertyTypeFilter, searchQuery, fetchListings]);
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
