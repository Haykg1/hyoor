'use client';

import { UserMenu } from '@/components/public/user-menu';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * Right-side cluster: language + theme are always visible.
 * UserMenu is hidden on mobile because the mobile sheet renders it inline.
 */
export function NavActions(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <LanguageSwitcher />
      <ThemeToggle />
      <div className="hidden md:block">
        <UserMenu variant="compact" />
      </div>
    </div>
  );
}
