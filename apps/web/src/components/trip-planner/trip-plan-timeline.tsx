'use client';

import type { TripPlanDetail, TripPlanItemView } from '@repo/shared';
import { resolveLocalizedLabel } from '@repo/shared';
import {
  BadgeCheck,
  Compass,
  Eye,
  Footprints,
  Loader2,
  MapPin,
  RefreshCw,
  Utensils,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatBookingDate } from '@/lib/format/booking-date';
import { formatStoredMoney } from '@/lib/format/money';
import { cn } from '@/lib/utils';

import { TripDayMapLazy } from './trip-day-map-lazy';

const PRICE_BAND_LABEL: Record<string, string> = { budget: '$', mid: '$$', upscale: '$$$' };

interface TripPlanTimelineProps {
  plan: TripPlanDetail;
  swappingId: string | null;
  onSwap: (itemId: string) => void;
}

function kindIcon(kind: TripPlanItemView['kind']): React.ReactNode {
  if (kind === 'meal') return <Utensils className="h-3.5 w-3.5" />;
  if (kind === 'activity') return <Compass className="h-3.5 w-3.5" />;
  if (kind === 'transfer') return <MapPin className="h-3.5 w-3.5" />;
  return <Eye className="h-3.5 w-3.5" />;
}

export function TripPlanTimeline({
  plan,
  swappingId,
  onSwap,
}: TripPlanTimelineProps): React.JSX.Element {
  const t = useTranslations('trip_planner');
  const locale = useLocale();
  const [selectedDate, setSelectedDate] = useState(plan.days[0]?.date ?? '');
  const day = useMemo(
    () => plan.days.find((entry) => entry.date === selectedDate) ?? plan.days[0],
    [plan.days, selectedDate],
  );
  const pace = plan.preferences.pace;
  const focus = plan.preferences.focus;
  const stopCount = plan.days.reduce((sum, entry) => sum + entry.items.length, 0);
  if (!day) {
    return <p className="text-sm text-muted-foreground">{t('history_empty')}</p>;
  }
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('plan_meta', {
          days: plan.days.length,
          stops: stopCount,
          pace: pace ?? '',
          focus: focus ?? '',
        })}
      </p>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {plan.days.map((entry) => {
          const active = entry.date === day.date;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedDate(entry.date)}
              className={cn(
                'whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide',
                active ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground',
              )}
            >
              {formatBookingDate(entry.date, { month: 'short', day: 'numeric' })}
            </button>
          );
        })}
      </div>
      <div>
        <h2 className="text-xl font-semibold">{day.theme}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatBookingDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
          {t('stops_count', { count: day.items.length })}
          {day.estimatedCostAmd
            ? ` · ${t('day_cost', { amount: formatStoredMoney(day.estimatedCostAmd, 'AMD') })}`
            : ''}
        </p>
      </div>
      <TripDayMapLazy key={day.id} day={day} />
      <ol className="space-y-8">
        {day.items.map((item) => (
          <li key={item.id} className="relative pl-16">
            <div className="absolute left-0 top-2 rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold">
              {item.startTime}
            </div>
            <article className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative h-48 bg-muted">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    {kindIcon(item.kind)}
                  </div>
                )}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                  {kindIcon(item.kind)}
                  {t(`kind_${item.kind}`)}
                </span>
                {item.verificationStatus === 'verified' ? (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#2E7D5B] px-2 py-1 text-[10px] font-semibold uppercase text-white">
                    <BadgeCheck className="h-3 w-3" />
                    {item.verifiedAt
                      ? t('verified_on', {
                          date: formatBookingDate(item.verifiedAt, {
                            month: 'short',
                            year: 'numeric',
                          }),
                        })
                      : t('verified')}
                  </span>
                ) : null}
                {item.photoAttribution ? (
                  <span className="absolute bottom-1 right-2 max-w-[80%] truncate rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-white/90">
                    {item.photoAttribution}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold">
                    {resolveLocalizedLabel(item.nameLabels, locale)}
                  </h3>
                  {item.priceBand ? (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {PRICE_BAND_LABEL[item.priceBand]}
                    </span>
                  ) : null}
                </div>
                {item.address ? (
                  <p className="text-sm text-muted-foreground">{item.address}</p>
                ) : null}
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="text-sm">{item.whyThisFits}</p>
                {item.openingHours ? (
                  <p className="text-xs text-muted-foreground">{item.openingHours}</p>
                ) : null}
                {item.walkToNextMinutes ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Footprints className="h-3.5 w-3.5" />
                    {t('walk_to_next', { minutes: item.walkToNextMinutes })}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <a href={item.yandexUrl} target="_blank" rel="noreferrer">
                      {t('directions')}
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <a href={item.mapsUrl} target="_blank" rel="noreferrer">
                      {t('open_google_maps')}
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={swappingId === item.id}
                    onClick={() => onSwap(item.id)}
                  >
                    {swappingId === item.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    )}
                    {t('swap_stop')}
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
