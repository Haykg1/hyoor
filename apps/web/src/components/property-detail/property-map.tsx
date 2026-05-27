'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

function fixDefaultIcon(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function PropertyMap({ latitude, longitude, title }: PropertyMapProps): React.JSX.Element {
  const t = useTranslations('property_detail.where');
  useEffect(() => {
    fixDefaultIcon();
  }, []);

  return (
    <section className="space-y-3 border-b border-border py-6">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <div className="h-72 overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={[latitude, longitude]}
          zoom={14}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]} title={title} />
        </MapContainer>
      </div>
    </section>
  );
}
