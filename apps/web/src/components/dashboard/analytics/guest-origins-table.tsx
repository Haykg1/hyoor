'use client';

import type { HostAnalyticsGuestOrigin } from '@repo/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { JSX } from 'react';

import { AnalyticsInfoHint } from '@/components/dashboard/analytics/analytics-info-hint';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { getCountryDisplayName } from '@/lib/format/country';

interface GuestOriginsTableProps {
  data: HostAnalyticsGuestOrigin[];
  settlementCurrency?: string;
  isLoading: boolean;
}

function countryFlag(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '';
  const chars = [...normalized].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...chars);
}

export function GuestOriginsTable({
  data,
  settlementCurrency = 'USD',
  isLoading,
}: GuestOriginsTableProps): JSX.Element {
  const t = useTranslations('dashboard.analytics');
  const locale = useLocale();
  const { formatMoney } = useDisplayMoney();
  const maxRevenue = Math.max(...data.map((row) => row.revenue), 1);
  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base">{t('origins.title')}</CardTitle>
          <AnalyticsInfoHint
            label={`${t('origins.title')} info`}
            description={t('hints.origins_calc')}
          />
        </div>
        <CardDescription>{t('hints.origins_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('origins.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {data.map((row, index) => {
              const widthPct = Math.max((row.revenue / maxRevenue) * 100, 4);
              return (
                <li
                  key={row.country}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[1.5rem_minmax(0,10rem)_auto_auto_auto_minmax(4rem,1fr)]"
                >
                  <span className="font-medium text-muted-foreground">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-2 truncate font-medium">
                    <span aria-hidden>{countryFlag(row.country)}</span>
                    <span className="truncate">{getCountryDisplayName(row.country, locale)}</span>
                  </span>
                  <span className="hidden text-muted-foreground sm:inline">
                    {t('origins.bookings', { count: row.bookings })}
                  </span>
                  <span className="hidden text-muted-foreground sm:inline">
                    {t('origins.nights', { count: row.nights })}
                  </span>
                  <span className="text-right font-medium tabular-nums">
                    {formatMoney(row.revenue, settlementCurrency)}
                  </span>
                  <div className="col-span-3 h-2 overflow-hidden rounded-full bg-muted sm:col-span-1">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
