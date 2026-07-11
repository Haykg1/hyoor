'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAdminTimeseries,
  type TimeseriesBucket,
  type TimeseriesMetric,
  type TimeseriesRange,
} from '@/lib/api/admin';
import { formatAmd } from '@/lib/format/price';
import { cn } from '@/lib/utils';

const METRICS: TimeseriesMetric[] = ['bookings', 'users', 'revenue'];
const RANGES: TimeseriesRange[] = ['day', 'week', 'month'];

function formatBucketLabel(iso: string, range: TimeseriesRange): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (range === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  if (range === 'week') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatValue(value: number, metric: TimeseriesMetric): string {
  if (metric === 'revenue') return formatAmd(value);
  return new Intl.NumberFormat('en-US').format(value);
}

function TimeseriesBars({
  data,
  metric,
  range,
  emptyLabel,
}: {
  data: TimeseriesBucket[];
  metric: TimeseriesMetric;
  range: TimeseriesRange;
  emptyLabel: string;
}): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-56 items-end gap-1.5 overflow-x-auto pb-8 pt-2">
      {data.map((point) => {
        const heightPct = Math.max((point.value / maxValue) * 100, point.value > 0 ? 4 : 0);
        return (
          <div
            key={point.bucket}
            className="group relative flex min-w-[1.75rem] flex-1 flex-col items-center justify-end"
            style={{ height: '100%' }}
          >
            <div
              className="absolute bottom-full mb-1 hidden rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block"
              role="tooltip"
            >
              {formatValue(point.value, metric)}
            </div>
            <div
              className="w-full max-w-[2.5rem] rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
              style={{ height: `${heightPct}%` }}
              title={formatValue(point.value, metric)}
            />
            <span className="absolute top-full mt-1 max-w-[3.5rem] truncate text-[10px] text-muted-foreground">
              {formatBucketLabel(point.bucket, range)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PlatformStatsTimeseries(): React.JSX.Element {
  const t = useTranslations('admin.stats');
  const [metric, setMetric] = useState<TimeseriesMetric>('bookings');
  const [range, setRange] = useState<TimeseriesRange>('day');
  const [data, setData] = useState<TimeseriesBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getAdminTimeseries({ metric, range });
        if (!cancelled) setData(response.data);
      } catch {
        if (!cancelled) {
          setData([]);
          setError(t('timeseries.error'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [metric, range, t]);
  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-4">
        <CardTitle className="text-base">{t('timeseries.title')}</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
            {METRICS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                data-state={metric === key ? 'active' : 'inactive'}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all',
                  'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
                )}
              >
                {t(`timeseries.metrics.${key}`)}
              </button>
            ))}
          </div>
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
            {RANGES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                data-state={range === key ? 'active' : 'inactive'}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all',
                  'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
                )}
              >
                {t(`timeseries.ranges.${key}`)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            {t('timeseries.loading')}
          </div>
        ) : error ? (
          <div className="flex h-56 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <TimeseriesBars
            data={data}
            metric={metric}
            range={range}
            emptyLabel={t('timeseries.empty')}
          />
        )}
      </CardContent>
    </Card>
  );
}
