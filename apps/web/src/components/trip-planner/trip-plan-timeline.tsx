'use client';

import type { TripPlanDetail, TripPlanItemView } from '@repo/shared';
import { resolveLocalizedLabel } from '@repo/shared';
import {
  BadgeCheck,
  Car,
  Clock,
  Compass,
  Eye,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  Utensils,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatBookingDate } from '@/lib/format/booking-date';
import { cn } from '@/lib/utils';

import { TripDayMapLazy } from './trip-day-map-lazy';

const PRICE_BAND_LABEL: Record<string, string> = { budget: '$', mid: '$$', upscale: '$$$' };
const DESCRIPTION_CLAMP = 180;

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

function driveLabel(item: TripPlanItemView, t: ReturnType<typeof useTranslations>): string | null {
  if (item.driveToNextMinutes == null) return null;
  return t('drive_to_next', { minutes: item.driveToNextMinutes });
}

function ItemDescription({
  description,
  whyThisFits,
}: {
  description: string;
  whyThisFits: string;
}): React.JSX.Element | null {
  const t = useTranslations('trip_planner');
  const [expanded, setExpanded] = useState(false);
  if (!description && !whyThisFits) return null;
  const longText = description.length > DESCRIPTION_CLAMP;
  const canExpand = longText || Boolean(whyThisFits);
  const shown =
    expanded || !longText ? description : `${description.slice(0, DESCRIPTION_CLAMP).trimEnd()}…`;
  return (
    <div className="space-y-2">
      {description ? (
        <p className="text-sm text-muted-foreground">
          {shown}
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="ml-1 font-medium text-primary hover:underline"
            >
              {expanded ? t('read_less') : t('read_more')}
            </button>
          ) : null}
        </p>
      ) : null}
      {expanded && whyThisFits ? (
        <p className="text-sm">
          <span className="font-medium">{t('why_picked')}: </span>
          {whyThisFits}
        </p>
      ) : null}
    </div>
  );
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
        </p>
      </div>
      <TripDayMapLazy key={day.id} day={day} />
      <ol className="space-y-8">
        {day.items.map((item) => {
          const drive = driveLabel(item, t);
          const priceLabel = item.priceBand ? PRICE_BAND_LABEL[item.priceBand] : t('price_free');
          return (
            <li key={item.id} className="relative pl-20 sm:pl-24">
              <div className="absolute left-0 top-2 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-border bg-card shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]">
                <span className="text-base font-semibold leading-none tracking-tight tabular-nums">
                  {item.startTime}
                </span>
              </div>
              <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="relative h-52 bg-muted">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {kindIcon(item.kind)}
                    </div>
                  )}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {kindIcon(item.kind)}
                    {t(`kind_${item.kind}`)}
                  </span>
                  {item.photoAttribution ? (
                    <span className="absolute bottom-1 right-2 max-w-[80%] truncate rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-white/90">
                      {item.photoAttribution}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-tight">
                      {resolveLocalizedLabel(item.nameLabels, locale)}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-sm font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {item.startTime}–{item.endTime}
                    </span>
                  </div>
                  {item.address ? (
                    <p className="text-sm text-muted-foreground">{item.address}</p>
                  ) : null}
                  {item.verificationStatus === 'verified' || priceLabel ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {item.verificationStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[#2E7D5B]">
                          <BadgeCheck className="h-4 w-4" />
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
                      {priceLabel ? (
                        <span className="font-medium text-[#2E7D5B]">{priceLabel}</span>
                      ) : null}
                    </div>
                  ) : null}
                  {item.openingHours ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {item.openingHours}
                    </p>
                  ) : null}
                  <ItemDescription description={item.description} whyThisFits={item.whyThisFits} />
                  {drive ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Car className="h-3.5 w-3.5 shrink-0" />
                      {drive}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-2">
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
                      {item.website ? (
                        <Button asChild variant="ghost" size="sm" className="rounded-full">
                          <a href={item.website} target="_blank" rel="noreferrer">
                            <Globe className="mr-1 h-3.5 w-3.5" />
                            {t('website')}
                          </a>
                        </Button>
                      ) : null}
                    </div>
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
          );
        })}
      </ol>
    </div>
  );
}
