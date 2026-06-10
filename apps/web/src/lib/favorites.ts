import type { AuthUser } from '@repo/shared';

export function canUseFavorites(user: AuthUser | null): boolean {
  return !user || user.role === 'GUEST';
}
