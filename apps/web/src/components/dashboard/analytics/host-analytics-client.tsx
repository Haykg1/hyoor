'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { JSX } from 'react';

import { AnalyticsKpiGrid } from '@/components/dashboard/analytics/analytics-kpi-grid';
import { AnalyticsPageHeader } from '@/components/dashboard/analytics/analytics-page-header';
import { GuestOriginsTable } from '@/components/dashboard/analytics/guest-origins-table';
import { MonthlyEarningsChart } from '@/components/dashboard/analytics/monthly-earnings-chart';
import { OccupancyTrendChart } from '@/components/dashboard/analytics/occupancy-trend-chart';
import { useHostAnalytics } from '@/hooks/use-host-analytics';
import { Link } from '@/i18n/navigation';
import { downloadHostAnalyticsCsv } from '@/lib/analytics/export-csv';

export function HostAnalyticsClient(): JSX.Element {
  const t = useTranslations('dashboard.analytics');
  const {
    data,
    isLoading,
    error,
    preset,
    customFrom,
    customTo,
    propertyId,
    properties,
    setPreset,
    setCustomFrom,
    setCustomTo,
    setPropertyId,
  } = useHostAnalytics();

  const subtitle = data
    ? t('subtitle', {
        period: new Date(data.period.to).toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      })
    : t('subtitle_loading');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back_to_dashboard')}
      </Link>
      <AnalyticsPageHeader
        subtitle={subtitle}
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        propertyId={propertyId}
        properties={properties}
        canExport={!!data && !isLoading}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onPropertyChange={setPropertyId}
        onExport={() => {
          if (!data) return;
          downloadHostAnalyticsCsv(data, `host-analytics-${data.period.preset}.csv`);
        }}
      />
      {error ? <p className="mb-6 text-sm text-destructive">{error}</p> : null}
      <div className="mb-6">
        <AnalyticsKpiGrid
          kpis={data?.kpis ?? null}
          settlementCurrency={data?.settlementCurrency ?? 'USD'}
          isLoading={isLoading}
        />
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <MonthlyEarningsChart
          data={data?.monthlyEarnings ?? []}
          settlementCurrency={data?.settlementCurrency ?? 'USD'}
          isLoading={isLoading}
        />
        <OccupancyTrendChart data={data?.occupancyTrend ?? []} isLoading={isLoading} />
      </div>
      <GuestOriginsTable
        data={data?.guestOrigins ?? []}
        settlementCurrency={data?.settlementCurrency ?? 'USD'}
        isLoading={isLoading}
      />
    </div>
  );
}
