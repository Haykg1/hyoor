'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { canUseFavorites } from '@/lib/favorites';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface NavFavoritesLinkProps {
  className?: string;
  onNavigate?: () => void;
}

export function NavFavoritesLink({
  className,
  onNavigate,
}: NavFavoritesLinkProps): React.JSX.Element | null {
  const t = useTranslations('nav');
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || !canUseFavorites(user)) {
    return null;
  }
  return (
    <Link
      href="/favorites"
      onClick={onNavigate}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <Heart className="h-4 w-4" aria-hidden />
      {t('favorites')}
    </Link>
  );
}
