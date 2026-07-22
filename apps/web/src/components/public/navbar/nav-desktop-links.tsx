'use client';

import { UserRole } from '@repo/shared';
import type { LucideIcon } from 'lucide-react';
import { Compass, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

interface NavLink {
  href: string;
  labelKey: 'explore' | 'become_host';
  icon: LucideIcon;
  forRoles: UserRole[];
  loggedOutOnly?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { href: '/search', labelKey: 'explore', icon: Compass, forRoles: ['GUEST', 'HOST', 'ADMIN'] },
  {
    href: '/host/onboarding',
    labelKey: 'become_host',
    icon: Home,
    forRoles: ['GUEST'],
    loggedOutOnly: true,
  },
];

interface NavDesktopLinksProps {
  className?: string;
}

export function NavDesktopLinks({ className }: NavDesktopLinksProps): React.JSX.Element {
  const t = useTranslations('nav');
  const { user, isLoading } = useAuthStore();
  const role = user?.role ?? 'GUEST';
  const visibleLinks = NAV_LINKS.filter((link) => {
    if (!link.forRoles.includes(role)) return false;
    if (link.loggedOutOnly && (isLoading || user)) return false;
    return true;
  });
  return (
    <nav className={cn('items-center gap-6', className)} aria-label="Primary">
      {visibleLinks.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export { NAV_LINKS };
export type { NavLink };
