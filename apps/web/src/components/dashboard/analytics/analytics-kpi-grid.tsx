'use client';

import type { HostAnalyticsKpis } from '@repo/shared';
import { BedDouble, Percent, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { JSX } from 'react';

import { AnalyticsInfoHint } from '@/components/dashboard/analytics/analytics-info-hint';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCardGrid } from '@/components/ui/stat-card';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { formatStoredMoney } from '@/lib/format/money';
import { cn } from '@/lib/utils';

interface AnalyticsKpiGridProps {
  kpis: HostAnalyticsKpis | null;
  settlementCurrency?: string;
  isLoading: boolean;
}

function TrendBadge({
  deltaPct,
  deltaAbs,
  invertColors,
  absoluteLabel,
}: {
  deltaPct: number | null;
  deltaAbs: number | null;
  invertColors?: boolean;
  absoluteLabel?: string;
}): JSX.Element | null {
  if (absoluteLabel) {
    if (deltaAbs === null || deltaAbs === 0) return null;
    const positive = deltaAbs > 0;
    const good = invertColors ? !positive : positive;
    return (
      <Badge
        variant="secondary"
        className={cn(
          'mt-2 gap-1 font-normal',
          good
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-destructive/10 text-destructive',
        )}
      >
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {absoluteLabel}
      </Badge>
    );
  }
  if (deltaPct === null || deltaPct === 0) return null;
  const positive = deltaPct > 0;
  const good = invertColors ? !positive : positive;
  return (
    <Badge
      variant="secondary"
      className={cn(
        'mt-2 gap-1 font-normal',
        good
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-destructive/10 text-destructive',
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}
      {deltaPct}%
    </Badge>
  );
}

function KpiCard({
  label,
  description,
  calcHint,
  value,
  secondary,
  caption,
  icon: Icon,
  trend,
}: {
  label: string;
  description: string;
  calcHint: string;
  value: string;
  secondary?: string | null;
  caption?: string;
  icon: typeof Wallet;
  trend: JSX.Element | null;
}): JSX.Element {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <AnalyticsInfoHint label={`${label} info`} description={calcHint} />
          </div>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>
        </div>
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
        {secondary ? <p className="mt-0.5 text-xs text-muted-foreground">{secondary}</p> : null}
        {caption ? <p className="mt-1 text-xs text-muted-foreground">{caption}</p> : null}
        {trend}
      </CardContent>
    </Card>
  );
}

export function AnalyticsKpiGrid({
  kpis,
  settlementCurrency = 'USD',
  isLoading,
}: AnalyticsKpiGridProps): JSX.Element {
  const t = useTranslations('dashboard.analytics');
  const { formatMoney, displayCurrency } = useDisplayMoney();
  const formatKpiMoney = (value: number | null): string => {
    if (value === null) return '—';
    return formatMoney(value, settlementCurrency);
  };
  const formatSettlementHint = (value: number | null): string | null => {
    if (value === null || displayCurrency === settlementCurrency) return null;
    return formatStoredMoney(Math.round(value), settlementCurrency);
  };
  if (isLoading || !kpis) {
    return (
      <StatCardGrid>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </CardContent>
          </Card>
        ))}
      </StatCardGrid>
    );
  }
  const nightsDelta = kpis.nightsBooked.deltaAbs;
  const cancelDelta = kpis.cancellationRate.deltaAbs;
  return (
    <StatCardGrid>
      <KpiCard
        label={t('kpis.adr')}
        description={t('hints.adr_desc')}
        calcHint={t('hints.adr_calc')}
        value={formatKpiMoney(kpis.adr.value)}
        secondary={formatSettlementHint(kpis.adr.valueUsd ?? kpis.adr.value)}
        icon={Wallet}
        trend={<TrendBadge deltaPct={kpis.adr.deltaPct} deltaAbs={kpis.adr.deltaAbs} />}
      />
      <KpiCard
        label={t('kpis.revpar')}
        description={t('hints.revpar_desc')}
        calcHint={t('hints.revpar_calc')}
        value={formatKpiMoney(kpis.revpar.value)}
        secondary={formatSettlementHint(kpis.revpar.valueUsd ?? kpis.revpar.value)}
        icon={TrendingUp}
        trend={<TrendBadge deltaPct={kpis.revpar.deltaPct} deltaAbs={kpis.revpar.deltaAbs} />}
      />
      <KpiCard
        label={t('kpis.nights_booked')}
        description={t('hints.nights_desc')}
        calcHint={t('hints.nights_calc')}
        value={
          kpis.nightsBooked.value === null
            ? '—'
            : new Intl.NumberFormat('en-US').format(kpis.nightsBooked.value)
        }
        caption={t('kpis.across_properties', {
          count: kpis.nightsBooked.secondary?.propertyCount ?? 0,
        })}
        icon={BedDouble}
        trend={
          <TrendBadge
            deltaPct={null}
            deltaAbs={nightsDelta}
            absoluteLabel={
              nightsDelta === null
                ? undefined
                : t('kpis.vs_prior_abs', {
                    value: `${nightsDelta >= 0 ? '+' : ''}${nightsDelta}`,
                  })
            }
          />
        }
      />
      <KpiCard
        label={t('kpis.cancellation_rate')}
        description={t('hints.cancellation_desc')}
        calcHint={t('hints.cancellation_calc')}
        value={kpis.cancellationRate.value === null ? '—' : `${kpis.cancellationRate.value}%`}
        caption={t('kpis.cancellations', {
          count: kpis.cancellationRate.secondary?.cancellationCount ?? 0,
        })}
        icon={Percent}
        trend={
          <TrendBadge
            deltaPct={null}
            deltaAbs={cancelDelta}
            invertColors
            absoluteLabel={
              cancelDelta === null
                ? undefined
                : t('kpis.vs_prior_abs', {
                    value: `${cancelDelta >= 0 ? '+' : ''}${cancelDelta}%`,
                  })
            }
          />
        }
      />
    </StatCardGrid>
  );
}
