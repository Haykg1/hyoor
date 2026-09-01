'use client';

import 'leaflet/dist/leaflet.css';

import type { TripPlanDayView } from '@repo/shared';
import { resolveLocalizedLabel } from '@repo/shared';
import L from 'leaflet';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

export interface TripDayMapProps {
  day: TripPlanDayView;
}

function numberedIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#B4761F;color:#fff;font:600 13px/1 system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,0.35)">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ points }: { points: [number, number][] }): null {
  const map = useMap();
  useEffect(() => {
    const first = points[0];
    if (!first) return;
    if (points.length === 1) {
      map.setView(first, 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [map, points]);
  return null;
}

export function TripDayMap({ day }: TripDayMapProps): React.JSX.Element | null {
  const t = useTranslations('trip_planner');
  const locale = useLocale();
  const stops = useMemo(
    () => day.items.filter((item) => item.kind !== 'transfer' && item.kind !== 'rest'),
    [day.items],
  );
  const points = useMemo<[number, number][]>(
    () => stops.map((stop) => [stop.latitude, stop.longitude]),
    [stops],
  );
  const center = points[0];
  if (!center) return null;
  return (
    <div className="relative isolate z-0 h-64 overflow-hidden rounded-2xl border border-border">
      <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 1 ? (
          <Polyline
            positions={points}
            pathOptions={{ color: '#B4761F', weight: 3, dashArray: '6 6' }}
          />
        ) : null}
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            icon={numberedIcon(index)}
          >
            <Popup>
              <p className="font-semibold">{resolveLocalizedLabel(stop.nameLabels, locale)}</p>
              <p className="text-xs text-muted-foreground">
                {stop.startTime} – {stop.endTime}
              </p>
              <a
                href={stop.yandexUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary underline"
              >
                {t('directions')}
              </a>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
