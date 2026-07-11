'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import type { PropertyMapProps } from './property-map';

/**
 * Client-side wrapper so `ssr: false` actually applies: calling next/dynamic with
 * `ssr: false` from a Server Component still evaluates leaflet on the server,
 * which crashes SSR with "window is not defined".
 */
export const PropertyMapLazy: ComponentType<PropertyMapProps> = dynamic(
  () => import('./property-map').then((m) => m.PropertyMap),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" />,
  },
);
