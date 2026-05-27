'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

interface NavLink {
  href: string;
  labelKey: 'explore' | 'become_host';
}

const NAV_LINKS: NavLink[] = [
  { href: '/search', labelKey: 'explore' },
  { href: '/host/onboarding', labelKey: 'become_host' },
];

interface NavDesktopLinksProps {
  className?: string;
}

export function NavDesktopLinks({ className }: NavDesktopLinksProps): React.JSX.Element {
  const t = useTranslations('nav');
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const hideLinks = mounted && !!user;
  return (
    <nav
      className={cn('items-center gap-6', className)}
      style={hideLinks ? { display: 'none' } : undefined}
      aria-label="Primary"
    >
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t(link.labelKey)}
        </Link>
      ))}
    </nav>
  );
}

export { NAV_LINKS };
export type { NavLink };
