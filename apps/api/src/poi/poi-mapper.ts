import type { PoiDestination, PoiDescriptionLabels, PoiNameLabels } from '@repo/shared';
import { parsePoiAttributes } from '@repo/shared';

export interface PoiRecord {
  id: string;
  city: string;
  region: string;
  country: string;
  citySlug: string;
  latitude: { toNumber?: () => number } | number | string;
  longitude: { toNumber?: () => number } | number | string;
  category: string;
  tags: string[];
  nameLabels: unknown;
  descriptionLabels: unknown;
  wikipediaTitle: string | null;
  wikipediaUrl: string | null;
  attributes: unknown;
  status: string;
  usableInPlanner: boolean;
  lastVerifiedAt: Date | string | null;
  sortOrder: number;
}

export function toCoord(value: PoiRecord['latitude']): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export function parseNameLabels(value: unknown): PoiNameLabels {
  const record = value as Partial<PoiNameLabels> | null;
  return {
    en: record?.en ?? '',
    hy: record?.hy ?? '',
    ru: record?.ru ?? '',
  };
}

export function parseDescriptionLabels(value: unknown): PoiDescriptionLabels {
  return parseNameLabels(value);
}

export function toPoiDestination(poi: PoiRecord): PoiDestination {
  return {
    id: poi.id,
    sortOrder: poi.sortOrder,
    category: poi.category,
    city: poi.city,
    region: poi.region,
    country: poi.country,
    latitude: toCoord(poi.latitude),
    longitude: toCoord(poi.longitude),
    nameLabels: parseNameLabels(poi.nameLabels),
    wikipediaTitle: poi.wikipediaTitle ?? undefined,
    wikipediaUrl: poi.wikipediaUrl ?? undefined,
  };
}

export function redisMetaFromPoi(poi: PoiRecord): string {
  return JSON.stringify(toPoiDestination(poi));
}

export { parsePoiAttributes };
