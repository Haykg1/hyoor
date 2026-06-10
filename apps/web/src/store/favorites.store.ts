import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { addFavorite, listFavoriteIds, removeFavorite } from '@/lib/api/favorites';

interface FavoritesState {
  favoriteIds: Set<string>;
  isHydrating: boolean;
  pendingIds: Set<string>;
  hydrateIds: () => Promise<void>;
  clearFavorites: () => void;
  isFavorite: (propertyId: string) => boolean;
  toggle: (propertyId: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>()(
  devtools(
    (set, get) => ({
      favoriteIds: new Set(),
      isHydrating: false,
      pendingIds: new Set(),
      hydrateIds: async () => {
        set({ isHydrating: true });
        try {
          const ids = await listFavoriteIds();
          set({ favoriteIds: new Set(ids), isHydrating: false });
        } catch {
          set({ favoriteIds: new Set(), isHydrating: false });
        }
      },
      clearFavorites: () => {
        set({ favoriteIds: new Set(), pendingIds: new Set(), isHydrating: false });
      },
      isFavorite: (propertyId) => get().favoriteIds.has(propertyId),
      toggle: async (propertyId) => {
        const { favoriteIds, pendingIds } = get();
        if (pendingIds.has(propertyId)) return;
        const wasFavorite = favoriteIds.has(propertyId);
        const nextIds = new Set(favoriteIds);
        const nextPending = new Set(pendingIds);
        nextPending.add(propertyId);
        if (wasFavorite) {
          nextIds.delete(propertyId);
        } else {
          nextIds.add(propertyId);
        }
        set({ favoriteIds: nextIds, pendingIds: nextPending });
        try {
          if (wasFavorite) {
            await removeFavorite(propertyId);
          } else {
            await addFavorite(propertyId);
          }
        } catch {
          const rollback = new Set(get().favoriteIds);
          if (wasFavorite) {
            rollback.add(propertyId);
          } else {
            rollback.delete(propertyId);
          }
          set({ favoriteIds: rollback });
          throw new Error('Failed to update favorite');
        } finally {
          const cleared = new Set(get().pendingIds);
          cleared.delete(propertyId);
          set({ pendingIds: cleared });
        }
      },
    }),
    { name: 'favorites-store' },
  ),
);
