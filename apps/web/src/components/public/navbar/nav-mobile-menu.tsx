'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { UserMenu } from '@/components/public/user-menu';
import { BrandWordmark } from '@/components/ui/brand-wordmark';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

import { NAV_LINKS } from './nav-desktop-links';
import { NavFavoritesLink } from './nav-favorites-link';
import { NavNotificationBell } from './nav-notification-bell';

export function NavMobileMenu(): React.JSX.Element {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();
  useEffect(() => {
    setMounted(true);
  }, []);
  const hideLinks = mounted && !!user;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('menu')}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">
            <BrandWordmark className="text-xl" />
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-2">
          <div className={cn('flex flex-col gap-2', hideLinks && 'hidden')}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
          </div>
          <NavFavoritesLink
            className="rounded-md px-3 py-2 hover:bg-muted"
            onNavigate={() => setOpen(false)}
          />
          <NavNotificationBell className="rounded-md px-3 py-2" />
          <UserMenu variant="compact" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
