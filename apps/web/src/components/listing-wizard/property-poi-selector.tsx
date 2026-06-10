'use client';

import type { NearbyPoiItem } from '@repo/shared';
import { MAX_FEATURED_POIS } from '@repo/shared';
import { Bus, Footprints } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { fetchNearbyDestinations } from '@/lib/api/poi';
import { formatDistanceKm, getMetroTravelEstimate } from '@/lib/poi-distance';
import { cn } from '@/lib/utils';

interface PropertyPoiSelectorProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  city: string | null | undefined;
  region?: string | null | undefined;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function resolvePoiName(poi: NearbyPoiItem, locale: string): string {
  const labels = poi.nameLabels;
  if (locale === 'hy' && labels.hy) return labels.hy;
  if (locale === 'ru' && labels.ru) return labels.ru;
  return labels.en || labels.hy || labels.ru || poi.id;
}

const POI_CATEGORY_KEYS = ['landmark', 'museum', 'park', 'market', 'memorial'] as const;
type PoiCategoryKey = (typeof POI_CATEGORY_KEYS)[number];

function isPoiCategoryKey(value: string): value is PoiCategoryKey {
  return (POI_CATEGORY_KEYS as readonly string[]).includes(value);
}

export function PropertyPoiSelector({
  latitude,
  longitude,
  city,
  region,
  selectedIds,
  onChange,
}: PropertyPoiSelectorProps): React.JSX.Element | null {
  const locale = useLocale();
  const t = useTranslations('listing_wizard.basics');
  const [loading, setLoading] = useState(false);
  const [pois, setPois] = useState<NearbyPoiItem[]>([]);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    if (latitude == null || longitude == null || !city?.trim()) {
      setPois([]);
      setAvailable(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchNearbyDestinations({
      latitude,
      longitude,
      city,
      region: region ?? null,
    })
      .then((response) => {
        if (cancelled) return;
        setPois(response.pois);
        setAvailable(response.citySlug !== null && response.pois.length > 0);
      })
      .catch(() => {
        if (!cancelled) {
          setPois([]);
          setAvailable(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, city, region]);
  if (latitude == null || longitude == null || !city?.trim()) return null;
  function handleToggle(poiId: string, checked: boolean): void {
    if (checked) {
      if (selectedIds.length >= MAX_FEATURED_POIS) return;
      onChange([...selectedIds, poiId]);
      return;
    }
    onChange(selectedIds.filter((id) => id !== poiId));
  }
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t('poi_section_title')}</h3>
          <p className="text-xs text-muted-foreground">{t('poi_select_hint')}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {t('poi_selected_count', { count: selectedIds.length, max: MAX_FEATURED_POIS })}
        </span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">{t('poi_loading')}</p>
      ) : !available ? (
        <p className="text-sm text-muted-foreground">{t('poi_none_available')}</p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {pois.map((poi) => {
            const checked = selectedIds.includes(poi.id);
            const atLimit = selectedIds.length >= MAX_FEATURED_POIS && !checked;
            const { mode, travelTime } = getMetroTravelEstimate(poi.distanceMeters);
            const distanceKm = formatDistanceKm(poi.distanceKm ?? poi.distanceMeters / 1000);
            const TravelIcon = mode === 'walk' ? Footprints : Bus;
            const distanceLabelKey = mode === 'walk' ? 'poi_distance_walk' : 'poi_distance_vehicle';
            return (
              <label
                key={poi.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors',
                  checked ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:bg-muted/40',
                  atLimit && 'cursor-not-allowed opacity-50',
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={atLimit}
                  onCheckedChange={(value) => handleToggle(poi.id, value === true)}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{resolvePoiName(poi, locale)}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {isPoiCategoryKey(poi.category)
                        ? t(`poi_categories.${poi.category}`)
                        : poi.category}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TravelIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{t(distanceLabelKey, { distanceKm, travelTime })}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
