import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { Locale } from '@/i18n/routing';

export default function AuthLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: Locale };
}): React.JSX.Element {
  setRequestLocale(locale);
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}
