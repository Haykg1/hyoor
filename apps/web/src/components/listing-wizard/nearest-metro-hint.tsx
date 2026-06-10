'use client';

import type { NearestMetroResponse } from '@repo/shared';
import { Bus, Footprints } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { fetchNearestMetro } from '@/lib/api/poi';
import { getMetroTravelEstimate, MAX_METRO_DISTANCE_METERS } from '@/lib/poi-distance';

interface NearestMetroHintProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  city: string | null | undefined;
  region?: string | null | undefined;
}

function resolveStationName(response: NearestMetroResponse, locale: string): string | null {
  if (!response.station) return null;
  const labels = response.station.nameLabels;
  if (locale === 'hy' && labels.hy) return labels.hy;
  if (locale === 'ru' && labels.ru) return labels.ru;
  return labels.en || labels.hy || labels.ru || null;
}

export function NearestMetroHint({
  latitude,
  longitude,
  city,
  region,
}: NearestMetroHintProps): React.JSX.Element | null {
  const locale = useLocale();
  const t = useTranslations('listing_wizard.basics');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NearestMetroResponse | null>(null);
  useEffect(() => {
    if (latitude == null || longitude == null || !city?.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchNearestMetro({
      latitude,
      longitude,
      city,
      region: region ?? null,
    })
      .then((response) => {
        if (!cancelled) setResult(response);
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, city, region]);
  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('nearest_metro_loading')}</p>;
  }
  if (!result?.station) return null;
  const stationName = resolveStationName(result, locale);
  if (
    result.distanceMeters == null ||
    result.distanceMeters > MAX_METRO_DISTANCE_METERS ||
    !stationName
  ) {
    return null;
  }
  const { mode, travelTime } = getMetroTravelEstimate(result.distanceMeters);
  const Icon = mode === 'walk' ? Footprints : Bus;
  const labelKey = mode === 'walk' ? 'nearest_metro_walk' : 'nearest_metro_vehicle';
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t(labelKey, { travelTime, station: stationName })}</span>
    </div>
  );
}
