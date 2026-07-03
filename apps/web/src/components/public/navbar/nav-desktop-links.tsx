'use client';

import { UserRole } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

interface NavLink {
  href: string;
  labelKey: 'explore' | 'ai_search' | 'become_host';
  forRoles: UserRole[];
}

const NAV_LINKS: NavLink[] = [
  { href: '/search', labelKey: 'explore', forRoles: ['GUEST', 'HOST', 'ADMIN'] },
  { href: '/ai-search', labelKey: 'ai_search', forRoles: ['GUEST', 'HOST', 'ADMIN'] },
  { href: '/host/onboarding', labelKey: 'become_host', forRoles: ['GUEST'] },
];

interface NavDesktopLinksProps {
  className?: string;
}

export function NavDesktopLinks({ className }: NavDesktopLinksProps): React.JSX.Element {
  const t = useTranslations('nav');
  const { user } = useAuthStore();
  const role = user?.role ?? 'GUEST';
  return (
    <nav className={cn('items-center gap-6', className)} aria-label="Primary">
      {NAV_LINKS.filter((link) => link.forRoles.includes(role)).map((link) => (
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
