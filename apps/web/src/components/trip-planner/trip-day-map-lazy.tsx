'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import type { TripDayMapProps } from './trip-day-map';

/**
 * Client-side wrapper so `ssr: false` actually applies: calling next/dynamic with
 * `ssr: false` from a Server Component still evaluates leaflet on the server,
 * which crashes SSR with "window is not defined".
 */
export const TripDayMapLazy: ComponentType<TripDayMapProps> = dynamic(
  () => import('./trip-day-map').then((m) => m.TripDayMap),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-2xl bg-muted" />,
  },
);
