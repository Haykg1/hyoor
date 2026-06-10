'use client';

import type { HostDashboardStats } from '@repo/shared';
import { CircleCheckBig, Clock, DollarSign, House } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { formatAmd } from '@/lib/format/price';

interface HostDashboardStatsProps {
  stats: HostDashboardStats;
}

export function HostDashboardStatsPanel({ stats }: HostDashboardStatsProps): React.JSX.Element {
  const t = useTranslations('dashboard.stats');
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
        label={t('total_earned')}
        value={formatAmd(stats.totalEarnings)}
      />
    </StatCardGrid>
  );
}
