'use client';

import { useEffect, useRef } from 'react';

import { useAdminListingsStore } from '@/store/admin-listings.store';

const SEARCH_DEBOUNCE_MS = 300;

export function useAdminListings() {
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
    earningsPreset,
    earningsFrom,
    earningsTo,
    isLoading,
    error,
    fetchListings,
    setPage,
    setLimit,
    setTab,
    setStatusFilter,
    setPropertyTypeFilter,
    setSearchQuery,
    setEarningsPreset,
    setEarningsFrom,
    setEarningsTo,
    resetFilters,
    disableListing,
    enableListing,
  } = useAdminListingsStore();
  const prevSearchQuery = useRef(searchQuery);
  useEffect(() => {
    const searchChanged = prevSearchQuery.current !== searchQuery;
    prevSearchQuery.current = searchQuery;
    const delay = searchChanged && searchQuery.trim() !== '' ? SEARCH_DEBOUNCE_MS : 0;
    const timer = window.setTimeout(() => {
      void fetchListings();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    page,
    limit,
    tab,
    statusFilter,
    propertyTypeFilter,
    searchQuery,
    earningsPreset,
    earningsFrom,
    earningsTo,
    fetchListings,
  ]);
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
    earningsPreset,
    earningsFrom,
    earningsTo,
    isLoading,
    error,
    setTab,
    setLimit,
    setPage,
    setStatusFilter,
    setPropertyTypeFilter,
    setSearchQuery,
    setEarningsPreset,
    setEarningsFrom,
    setEarningsTo,
    resetFilters,
    disableListing,
    enableListing,
  };
}
