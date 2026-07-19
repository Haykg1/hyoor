'use client';

import type { HostDashboardStats } from '@repo/shared';
import { CircleCheckBig, Clock, DollarSign, House } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { formatUsdFromMinor } from '@/lib/format/price';

interface HostDashboardStatsProps {
  stats: HostDashboardStats;
  variant?: 'host' | 'admin';
}

function formatEarningsRange(fromIso?: string, toIso?: string): string | null {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
}

export function HostDashboardStatsPanel({
  stats,
  variant = 'host',
}: HostDashboardStatsProps): React.JSX.Element {
  const t = useTranslations('dashboard.stats');
  const { formatMoney } = useDisplayMoney();
  const isAdmin = variant === 'admin';
  const earningsValue = isAdmin
    ? formatUsdFromMinor(stats.totalEarnings)
    : formatMoney(stats.totalEarnings, stats.earningsCurrency ?? 'USD');
  const earningsLabel = isAdmin ? t('platform_fees_earned') : t('total_earned');
  const rangeHint = isAdmin ? formatEarningsRange(stats.earningsFrom, stats.earningsTo) : null;
  return (
    <StatCardGrid>
      <StatCard icon={House} label={t('total_properties')} value={String(stats.totalListings)} />
      <StatCard
        icon={CircleCheckBig}
        label={t('active_listings')}
        value={String(stats.activeListings)}
      />
      <StatCard
        icon={Clock}
        label={t('upcoming_reservations')}
        value={String(stats.upcomingReservations)}
      />
      <StatCard
        icon={DollarSign}
        label={earningsLabel}
        value={earningsValue}
        delta={rangeHint ?? undefined}
      />
    </StatCardGrid>
  );
}
