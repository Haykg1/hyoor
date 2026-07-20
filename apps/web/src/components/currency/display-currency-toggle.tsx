'use client';

import { SEARCH_DISPLAY_CURRENCIES, type SearchDisplayCurrency } from '@repo/shared';
import { useTranslations } from 'next-intl';
import type { JSX } from 'react';

import { cn } from '@/lib/utils';

interface DisplayCurrencyToggleProps {
  value: SearchDisplayCurrency;
  onChange: (currency: SearchDisplayCurrency) => void;
  className?: string;
}

export function DisplayCurrencyToggle({
  value,
  onChange,
  className,
}: DisplayCurrencyToggleProps): JSX.Element {
  const t = useTranslations('search.currency');
  return (
    <div
      className={cn('inline-flex h-9 items-center rounded-md border border-input p-0.5', className)}
      role="group"
      aria-label={t('label')}
    >
      {SEARCH_DISPLAY_CURRENCIES.map((currency) => (
        <button
          key={currency}
          type="button"
          onClick={() => onChange(currency)}
          className={cn(
            'inline-flex h-8 items-center rounded-sm px-2.5 text-xs font-medium transition-colors',
            value === currency
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={value === currency}
        >
          {currency}
        </button>
      ))}
    </div>
  );
}
