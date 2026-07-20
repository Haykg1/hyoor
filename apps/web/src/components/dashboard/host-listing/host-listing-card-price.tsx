'use client';

import { useTranslations } from 'next-intl';
import type { JSX } from 'react';

import { useDisplayMoney } from '@/hooks/use-display-money';
import { cn } from '@/lib/utils';

interface HostListingCardPriceProps {
  pricePerNight: number;
  currency: string;
  totalEarnings: number;
  showEarnings: boolean;
  compact?: boolean;
  className?: string;
}

export function HostListingCardPrice({
  pricePerNight,
  currency,
  totalEarnings,
  showEarnings,
  compact = false,
  className,
}: HostListingCardPriceProps): JSX.Element {
  const t = useTranslations('dashboard');
  const { formatMoney } = useDisplayMoney();
  const priceLabel = formatMoney(pricePerNight, currency);
  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur',
          className,
        )}
      >
        {priceLabel}
        <span className="ml-1 font-normal text-muted-foreground">/{t('per_night')}</span>
      </span>
    );
  }
  return (
    <div className={cn('text-right', className)}>
      <p className="text-xl font-bold tracking-tight text-foreground">{priceLabel}</p>
      <p className="text-xs text-muted-foreground">{t('per_night')}</p>
      {showEarnings ? (
        <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {t('total_earnings', { amount: formatMoney(totalEarnings, currency) })}
        </p>
      ) : null}
    </div>
  );
}
