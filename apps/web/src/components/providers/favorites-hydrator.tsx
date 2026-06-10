'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth.store';
import { useFavoritesStore } from '@/store/favorites.store';

export function FavoritesHydrator(): null {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrateIds = useFavoritesStore((s) => s.hydrateIds);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);
  useEffect(() => {
    if (isLoading) return;
    if (user?.role === 'GUEST') {
      void hydrateIds();
      return;
    }
    clearFavorites();
  }, [user?.id, user?.role, isLoading, hydrateIds, clearFavorites]);
  return null;
}
