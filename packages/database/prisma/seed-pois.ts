import { Prisma, PrismaClient } from '../src/generated/client';

import armeniaPois from '../../shared/src/data/armenia_pois.json';
import yerevanPois from '../../shared/src/data/yerevan_pois.json';

interface SeedPoiLabels {
  en: string;
  hy: string;
  ru: string;
}

interface SeedPoiRow {
  id: string;
  sortOrder: number;
  category: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  wikipediaTitle?: string;
  wikipediaUrl?: string;
  wikidataId?: string;
  nameLabels: SeedPoiLabels;
  descriptionLabels?: SeedPoiLabels;
  tags?: string[];
  attributes?: Record<string, unknown>;
  curated?: boolean;
}

function toCitySlug(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, '-');
}

function emptyDescription(name: SeedPoiLabels): SeedPoiLabels {
  return { en: name.en, hy: name.hy, ru: name.ru };
}

function tagsForCategory(category: string): string[] {
  if (category === 'park' || category === 'viewpoint') return ['nature', 'relaxed'];
  if (category === 'restaurant' || category === 'cafe' || category === 'market') {
    return ['food', 'modern'];
  }
  if (category === 'gastrobar' || category === 'pub' || category === 'winery') {
    return ['food', 'alcohol', 'nightlife'];
  }
  return ['historical', 'culture'];
}

export function collectCatalogPois(): SeedPoiRow[] {
  const byId = new Map<string, SeedPoiRow>();
  for (const poi of yerevanPois as SeedPoiRow[]) {
    byId.set(poi.id, poi);
  }
  for (const pois of Object.values(armeniaPois as Record<string, SeedPoiRow[]>)) {
    for (const poi of pois) {
      byId.set(poi.id, poi);
    }
  }
  return [...byId.values()].sort((left, right) => {
    const cityCmp = left.city.localeCompare(right.city);
    if (cityCmp !== 0) return cityCmp;
    return left.sortOrder - right.sortOrder;
  });
}

export async function seedCatalogPois(prisma: PrismaClient): Promise<number> {
  const pois = collectCatalogPois();
  for (const poi of pois) {
    await prisma.poi.upsert({
      where: { id: poi.id },
      update: {
        city: poi.city,
        region: poi.region,
        country: poi.country || 'AM',
        citySlug: toCitySlug(poi.city),
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: poi.category,
        wikipediaTitle: poi.wikipediaTitle ?? null,
        wikipediaUrl: poi.wikipediaUrl ?? null,
        wikidataId: poi.wikidataId ?? null,
        sortOrder: poi.sortOrder,
      },
      create: {
        id: poi.id,
        city: poi.city,
        region: poi.region,
        country: poi.country || 'AM',
        citySlug: toCitySlug(poi.city),
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: poi.category,
        tags: poi.tags ?? tagsForCategory(poi.category),
        nameLabels: poi.nameLabels as unknown as Prisma.InputJsonValue,
        descriptionLabels: (poi.descriptionLabels ??
          emptyDescription(poi.nameLabels)) as unknown as Prisma.InputJsonValue,
        wikipediaTitle: poi.wikipediaTitle ?? null,
        wikipediaUrl: poi.wikipediaUrl ?? null,
        wikidataId: poi.wikidataId ?? null,
        attributes: (poi.attributes ?? {}) as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        usableInPlanner: true,
        lastVerifiedAt: poi.curated ? new Date() : null,
        sortOrder: poi.sortOrder,
      },
    });
  }
  return pois.length;
}
