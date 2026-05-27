'use client';

import { Check, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

const LOCALE_META: Record<Locale, { flag: string; labelKey: 'en' | 'hy' | 'ru' }> = {
  en: { flag: '🇬🇧', labelKey: 'en' },
  hy: { flag: '🇦🇲', labelKey: 'hy' },
  ru: { flag: '🇷🇺', labelKey: 'ru' },
};

export function LanguageSwitcher(): React.JSX.Element {
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('switch')}
          className="h-8 gap-1.5 px-2 text-xs font-medium uppercase"
        >
          <Globe className="h-4 w-4" />
          {locale}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((code) => {
          const meta = LOCALE_META[code];
          const isActive = code === locale;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => router.replace(pathname, { locale: code })}
              className="flex items-center justify-between"
            >
              <span>
                {meta.flag} {t(meta.labelKey)}
              </span>
              {isActive ? <Check className="h-4 w-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
