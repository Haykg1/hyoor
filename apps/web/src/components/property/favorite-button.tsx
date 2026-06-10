'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';

import { canUseFavorites } from '@/lib/favorites';
import { useAuthStore } from '@/store/auth.store';
import { useFavoritesStore } from '@/store/favorites.store';

import { FavoriteLoginDialog } from './favorite-login-dialog';

interface FavoriteButtonProps {
  propertyId: string;
}

export function FavoriteButton({ propertyId }: FavoriteButtonProps): React.JSX.Element | null {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(propertyId));
  const pendingIds = useFavoritesStore((s) => s.pendingIds);
  const toggle = useFavoritesStore((s) => s.toggle);
  const [loginOpen, setLoginOpen] = useState(false);
  if (!canUseFavorites(user)) {
    return null;
  }
  const isPending = pendingIds.has(propertyId);
  const isActive = isAuthenticated && isFavorite;
  async function handleClick(event: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    try {
      await toggle(propertyId);
    } catch {
      // Rollback handled in store
    }
  }
  return (
    <>
      <button
        type="button"
        aria-label={isActive ? 'Remove from favorites' : 'Save to favorites'}
        aria-pressed={isActive}
        disabled={isPending}
        onClick={(event) => void handleClick(event)}
        className="absolute right-3 top-3 rounded-full bg-white/80 p-1.5 transition-colors hover:bg-white disabled:opacity-60"
      >
        <Heart
          className={
            isActive ? 'h-4 w-4 fill-red-500 text-red-500' : 'h-4 w-4 text-muted-foreground'
          }
          aria-hidden
        />
      </button>
      <FavoriteLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
