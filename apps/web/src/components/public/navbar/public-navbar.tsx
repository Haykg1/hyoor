import { BrandWordmark } from '@/components/ui/brand-wordmark';
import { Link } from '@/i18n/navigation';

import { NavActions } from './nav-actions';
import { NavDesktopLinks } from './nav-desktop-links';
import { NavMobileMenu } from './nav-mobile-menu';

export function PublicNavbar(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="RentStar home" className="shrink-0">
          <BrandWordmark className="text-xl" />
        </Link>
        <NavDesktopLinks className="hidden md:flex" />
        <div className="flex items-center gap-1">
          <NavActions />
          <NavMobileMenu />
        </div>
      </div>
    </header>
  );
}
