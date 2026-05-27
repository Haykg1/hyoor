'use client';

import type { HostListingTab } from '@repo/shared';
import { useEffect } from 'react';

import { useHostListingsStore } from '@/store/host-listings.store';

export function useHostListings() {
  const {
    listings,
    stats,
    page,
    limit,
    total,
    totalPages,
    tab,
    isLoading,
    error,
    fetchListings,
    setPage,
    setLimit,
    setTab,
    softDeleteListing,
  } = useHostListingsStore();

  useEffect(() => {
    void fetchListings();
  }, [page, limit, tab, fetchListings]);

  function handleSetTab(nextTab: HostListingTab) {
    setTab(nextTab);
  }

  function handleSetLimit(nextLimit: 10 | 20 | 30) {
    setLimit(nextLimit);
  }

  function handleSetPage(nextPage: number) {
    setPage(nextPage);
  }

  async function handleSoftDelete(id: string) {
    await softDeleteListing(id);
  }

  return {
    listings,
    stats,
    page,
    limit,
    total,
    totalPages,
    tab,
    isLoading,
    error,
    setTab: handleSetTab,
    setLimit: handleSetLimit,
    setPage: handleSetPage,
    softDeleteListing: handleSoftDelete,
  };
}
