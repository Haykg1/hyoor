'use client';

import type { HostAnalyticsMonthlyEarning } from '@repo/shared';
import { useTranslations } from 'next-intl';
import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AnalyticsInfoHint } from '@/components/dashboard/analytics/analytics-info-hint';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { formatCurrencyAmount } from '@/lib/format/price';

interface MonthlyEarningsChartProps {
  data: HostAnalyticsMonthlyEarning[];
  settlementCurrency?: string;
  isLoading: boolean;
}

function monthLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function MonthlyEarningsChart({
  data,
  settlementCurrency = 'USD',
  isLoading,
}: MonthlyEarningsChartProps): JSX.Element {
  const t = useTranslations('dashboard.analytics');
  const { convert, displayCurrency } = useDisplayMoney();
  const currentMonth = startOfUtcMonth(new Date()).toISOString();
  const chartData = data.map((row) => {
    const converted = convert(row.earnings, settlementCurrency);
    return {
      ...row,
      displayEarnings: converted ?? row.earnings,
      tipCurrency: converted === null ? settlementCurrency : displayCurrency,
    };
  });
  const hasData = chartData.some((row) => row.earnings > 0);
  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base">{t('charts.earnings_title')}</CardTitle>
          <AnalyticsInfoHint
            label={`${t('charts.earnings_title')} info`}
            description={t('hints.earnings_calc')}
          />
        </div>
        <CardDescription>{t('hints.earnings_desc')}</CardDescription>
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
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)
                  }
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const tipCurrency =
                      (item?.payload as { tipCurrency?: string } | undefined)?.tipCurrency ??
                      displayCurrency;
                    return [
                      formatCurrencyAmount(
                        Math.round(typeof value === 'number' ? value : Number(value ?? 0)),
                        tipCurrency,
                      ),
                      t('charts.earnings'),
                    ];
                  }}
                  labelFormatter={(label) => monthLabel(String(label ?? ''))}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                  }}
                />
                <Bar dataKey="displayEarnings" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.month}
                      className={entry.month === currentMonth ? 'fill-primary' : 'fill-primary/40'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
