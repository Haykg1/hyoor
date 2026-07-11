'use client';

import { Building2, CalendarCheck, Star, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import type { PlatformStats } from '@/lib/api/admin';

interface PlatformStatsOverviewProps {
  stats: PlatformStats;
}

const ROLE_KEYS = new Set(['GUEST', 'HOST', 'ADMIN', 'STAFF']);

function BreakdownList({
  entries,
  labelFor,
}: {
  entries: [string, number][];
  labelFor: (key: string) => string;
}): React.JSX.Element {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map(([key, count]) => (
        <li key={key} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{labelFor(key)}</span>
          <span className="font-medium tabular-nums text-foreground">{count}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlatformStatsOverview({ stats }: PlatformStatsOverviewProps): React.JSX.Element {
  const t = useTranslations('admin.stats');
  const tRole = useTranslations('admin.stats.roles');
  const tProperty = useTranslations('property.status');
  const tBooking = useTranslations('booking.status');
  const roleEntries = Object.entries(stats.users.byRole).sort((a, b) => b[1] - a[1]);
  const propertyEntries = Object.entries(stats.properties.byStatus).sort((a, b) => b[1] - a[1]);
  const bookingEntries = Object.entries(stats.bookings.byStatus).sort((a, b) => b[1] - a[1]);
  const avgRating = stats.reviews.avgRating === null ? '—' : stats.reviews.avgRating.toFixed(1);
  return (
    <div className="space-y-6">
      <StatCardGrid>
        <StatCard
          icon={Users}
          label={t('cards.total_users')}
          value={String(stats.users.total)}
          delta={t('cards.active_users', { count: stats.users.active })}
          deltaPositive
        />
        <StatCard
          icon={Building2}
          label={t('cards.total_properties')}
          value={String(stats.properties.total)}
        />
        <StatCard
          icon={CalendarCheck}
          label={t('cards.total_bookings')}
          value={String(stats.bookings.total)}
        />
        <StatCard
          icon={Star}
          label={t('cards.reviews')}
          value={String(stats.reviews.total)}
          delta={t('cards.avg_rating', { rating: avgRating })}
          deltaPositive
        />
      </StatCardGrid>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('breakdown.users_by_role')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              entries={roleEntries}
              labelFor={(key) => (ROLE_KEYS.has(key) ? tRole(key as 'GUEST') : key)}
            />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('breakdown.properties_by_status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              entries={propertyEntries}
              labelFor={(key) => tProperty(key as 'ACTIVE')}
            />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('breakdown.bookings_by_status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList
              entries={bookingEntries}
              labelFor={(key) => tBooking(key as 'CONFIRMED')}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
