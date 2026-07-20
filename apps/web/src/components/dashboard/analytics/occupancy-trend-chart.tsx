'use client';

import type { HostAnalyticsOccupancyPoint } from '@repo/shared';
import { useTranslations } from 'next-intl';
import type { JSX } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AnalyticsInfoHint } from '@/components/dashboard/analytics/analytics-info-hint';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface OccupancyTrendChartProps {
  data: HostAnalyticsOccupancyPoint[];
  isLoading: boolean;
}

function monthLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function OccupancyTrendChart({ data, isLoading }: OccupancyTrendChartProps): JSX.Element {
  const t = useTranslations('dashboard.analytics');
  const chartData = data.map((row) => ({
    month: row.month,
    host: row.hostPct,
    market: row.marketPct,
  }));
  const hasData = data.some((row) => row.hostPct !== null || row.marketPct !== null);
  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base">{t('charts.occupancy_title')}</CardTitle>
          <AnalyticsInfoHint
            label={`${t('charts.occupancy_title')} info`}
            description={t('hints.occupancy_calc')}
          />
        </div>
        <CardDescription>{t('hints.occupancy_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !hasData ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            {t('charts.empty')}
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${typeof value === 'number' ? value : Number(value ?? 0)}%`,
                    name === 'host' ? t('charts.host_occupancy') : t('charts.market_occupancy'),
                  ]}
                  labelFormatter={(label) => monthLabel(String(label ?? ''))}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'host' ? t('charts.host_occupancy') : t('charts.market_occupancy')
                  }
                />
                <Area
                  type="monotone"
                  dataKey="host"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="market"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
