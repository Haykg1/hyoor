'use client';

import type { NearestMetroResponse, PropertyFeaturedPoiView, PropertyDetail } from '@repo/shared';
import { Bus, Footprints, Landmark, MapPin, Mountain, Store, TreePine } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { fetchNearestMetro } from '@/lib/api/poi';
import { getMetroTravelEstimate, MAX_METRO_DISTANCE_METERS } from '@/lib/poi-distance';

interface PropertyNearbyPlacesProps {
  property: Pick<PropertyDetail, 'latitude' | 'longitude' | 'city' | 'region' | 'featuredPois'>;
}

function resolveLabels(labels: PropertyFeaturedPoiView['nameLabels'], locale: string): string {
  if (locale === 'hy' && labels.hy) return labels.hy;
  if (locale === 'ru' && labels.ru) return labels.ru;
  return labels.en || labels.hy || labels.ru;
}

function CategoryIcon({ category }: { category: string }): React.JSX.Element {
  if (category === 'park') return <TreePine className="h-4 w-4 shrink-0" aria-hidden />;
  if (category === 'market') return <Store className="h-4 w-4 shrink-0" aria-hidden />;
  if (category === 'museum' || category === 'memorial') {
    return <Landmark className="h-4 w-4 shrink-0" aria-hidden />;
  }
  if (category === 'landmark') return <Mountain className="h-4 w-4 shrink-0" aria-hidden />;
  return <MapPin className="h-4 w-4 shrink-0" aria-hidden />;
}

export function PropertyNearbyPlaces({
  property,
}: PropertyNearbyPlacesProps): React.JSX.Element | null {
  const locale = useLocale();
  const t = useTranslations('property');
  const tBasics = useTranslations('listing_wizard.basics');
  const [metro, setMetro] = useState<NearestMetroResponse | null>(null);
  const featuredPois = property.featuredPois ?? [];
  const latitude = property.latitude;
  const longitude = property.longitude;
  useEffect(() => {
    if (latitude == null || longitude == null || !property.city?.trim()) {
      setMetro(null);
      return;
    }
    let cancelled = false;
    fetchNearestMetro({
      latitude,
      longitude,
      city: property.city,
      region: property.region,
    })
      .then((response) => {
        if (!cancelled) setMetro(response);
      })
      .catch(() => {
        if (!cancelled) setMetro(null);
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, property.city, property.region]);
  const showMetro =
    metro?.station &&
    metro.distanceMeters !== null &&
    metro.distanceMeters <= MAX_METRO_DISTANCE_METERS;
  if (!showMetro && featuredPois.length === 0) return null;
  const metroName = showMetro ? resolveLabels(metro!.station!.nameLabels, locale) : null;
  const metroEstimate =
    showMetro && metro?.distanceMeters ? getMetroTravelEstimate(metro.distanceMeters) : null;
  const MetroIcon = metroEstimate?.mode === 'walk' ? Footprints : Bus;
  return (
    <section className="border-t border-border py-8">
      <h2 className="mb-4 text-xl font-semibold">{t('nearby_places')}</h2>
      <div className="space-y-4">
        {showMetro && metroName && metroEstimate && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t('nearest_metro')}</h3>
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <MetroIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                {tBasics(
                  metroEstimate.mode === 'walk' ? 'nearest_metro_walk' : 'nearest_metro_vehicle',
                  { travelTime: metroEstimate.travelTime, station: metroName },
                )}
              </span>
            </div>
          </div>
        )}
        {featuredPois.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              {t('featured_destinations')}
            </h3>
            <ul className="space-y-2">
              {featuredPois.map((poi) => {
                const { mode, travelTime } = getMetroTravelEstimate(poi.distanceMeters);
                const TravelIcon = mode === 'walk' ? Footprints : Bus;
                return (
                  <li
                    key={poi.id}
                    className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <CategoryIcon category={poi.category} />
                    <span className="min-w-0 flex-1 font-medium">
                      {resolveLabels(poi.nameLabels, locale)}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <TravelIcon className="h-3.5 w-3.5" aria-hidden />
                      {t(mode === 'walk' ? 'travel_time_walk' : 'travel_time_vehicle', {
                        travelTime,
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
