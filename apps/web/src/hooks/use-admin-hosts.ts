'use client';

import { useEffect } from 'react';

import { useAdminHostsStore } from '@/store/admin-hosts.store';

const SEARCH_DEBOUNCE_MS = 300;

export function useAdminHosts() {
  const {
    hosts,
    page,
    limit,
    total,
    totalPages,
    searchQuery,
    hostType,
    isVerified,
    hasFeeOverride,
    isLoading,
    error,
    savingId,
    fetchHosts,
    setPage,
    setSearchQuery,
    setHostType,
    setIsVerified,
    setHasFeeOverride,
    resetFilters,
    savePlatformFee,
  } = useAdminHostsStore();

  useEffect(() => {
    void fetchHosts();
  }, [page, hostType, isVerified, hasFeeOverride, fetchHosts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchHosts();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery, fetchHosts]);

  return {
    hosts,
    page,
    limit,
    total,
    totalPages,
    searchQuery,
    hostType,
    isVerified,
    hasFeeOverride,
    isLoading,
    error,
    savingId,
    setPage,
    setSearchQuery,
    setHostType,
    setIsVerified,
    setHasFeeOverride,
    resetFilters,
    savePlatformFee,
  };
}
