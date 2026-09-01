import type { Prisma, PrismaClient } from '@repo/database/client';

interface SeedPoiInput {
  id: string;
  category: string;
  tags: string[];
  lat: number;
  lng: number;
  name: string;
  attributes?: Prisma.InputJsonValue;
  verified?: boolean;
}

const YEREVAN_POIS: SeedPoiInput[] = [
  {
    id: 'tp-cascade',
    category: 'landmark',
    tags: ['historical', 'modern', 'culture'],
    lat: 40.1918,
    lng: 44.5152,
    name: 'Cascade Complex',
  },
  {
    id: 'tp-republic-square',
    category: 'landmark',
    tags: ['historical', 'culture'],
    lat: 40.1776,
    lng: 44.5126,
    name: 'Republic Square',
  },
  {
    id: 'tp-matenadaran',
    category: 'museum',
    tags: ['historical', 'culture'],
    lat: 40.1918,
    lng: 44.5218,
    name: 'Matenadaran',
  },
  {
    id: 'tp-history-museum',
    category: 'museum',
    tags: ['historical', 'culture'],
    lat: 40.1774,
    lng: 44.5128,
    name: 'History Museum of Armenia',
  },
  {
    id: 'tp-vernissage',
    category: 'market',
    tags: ['modern', 'culture'],
    lat: 40.1783,
    lng: 44.5165,
    name: 'Vernissage Market',
  },
  {
    id: 'tp-victory-park',
    category: 'park',
    tags: ['nature', 'relaxed'],
    lat: 40.2003,
    lng: 44.5205,
    name: 'Victory Park',
  },
  {
    id: 'tp-lovers-park',
    category: 'park',
    tags: ['nature', 'relaxed'],
    lat: 40.1897,
    lng: 44.5216,
    name: 'Lovers Park',
  },
  {
    id: 'tp-hraparak-view',
    category: 'viewpoint',
    tags: ['nature', 'relaxed'],
    lat: 40.1955,
    lng: 44.5169,
    name: 'Cascade Top Viewpoint',
  },
  {
    id: 'tp-tavern-yerevan',
    category: 'restaurant',
    tags: ['food', 'modern'],
    lat: 40.1808,
    lng: 44.5142,
    name: 'Tavern Yerevan',
    attributes: {
      priceBand: 'mid',
      averageMealAmd: 6000,
      typicalDurationMin: 75,
      openingHoursNote: '11:00-23:00',
    },
  },
  {
    id: 'tp-lavash-restaurant',
    category: 'restaurant',
    tags: ['food', 'modern'],
    lat: 40.1823,
    lng: 44.5155,
    name: 'Lavash Restaurant',
    attributes: {
      priceBand: 'mid',
      averageMealAmd: 8000,
      typicalDurationMin: 90,
      openingHoursNote: '12:00-24:00',
    },
  },
  {
    id: 'tp-in-vino',
    category: 'winery',
    tags: ['alcohol', 'nightlife', 'food'],
    lat: 40.1802,
    lng: 44.5148,
    name: 'In Vino Wine Bar',
    attributes: { priceBand: 'upscale', servesAlcohol: true, typicalDurationMin: 90 },
  },
  {
    id: 'tp-ararat-brandy',
    category: 'factory',
    tags: ['alcohol', 'historical', 'culture'],
    lat: 40.1668,
    lng: 44.5015,
    name: 'Ararat Brandy Factory',
    attributes: {
      priceBand: 'mid',
      servesAlcohol: true,
      typicalDurationMin: 120,
      openingHoursNote: '10:00-17:00',
    },
  },
  {
    id: 'tp-blue-mosque',
    category: 'landmark',
    tags: ['historical', 'culture'],
    lat: 40.1817,
    lng: 44.5075,
    name: 'Blue Mosque',
  },
  {
    id: 'tp-katoghike',
    category: 'church',
    tags: ['historical', 'culture'],
    lat: 40.1846,
    lng: 44.5175,
    name: 'Katoghike Church',
  },
  {
    id: 'tp-northern-avenue',
    category: 'landmark',
    tags: ['modern'],
    lat: 40.1808,
    lng: 44.5138,
    name: 'Northern Avenue',
  },
];

/**
 * Inserts a curated Yerevan POI catalog large enough for the trip planner to
 * treat Yerevan as a supported city. `resetE2eDatabase` truncates POIs, so call
 * this in `beforeEach` for planner specs.
 */
export async function seedPlannerPois(prisma: PrismaClient): Promise<void> {
  await prisma.poi.createMany({
    data: YEREVAN_POIS.map((poi, index) => ({
      id: poi.id,
      city: 'Yerevan',
      region: 'Yerevan',
      country: 'AM',
      citySlug: 'yerevan',
      latitude: poi.lat,
      longitude: poi.lng,
      category: poi.category,
      tags: poi.tags,
      nameLabels: { en: poi.name, hy: poi.name, ru: poi.name },
      descriptionLabels: {
        en: `${poi.name} is a well-known spot in central Yerevan.`,
        hy: `${poi.name}`,
        ru: `${poi.name}`,
      },
      attributes: poi.attributes ?? ({} as Prisma.InputJsonValue),
      status: 'PUBLISHED',
      usableInPlanner: true,
      lastVerifiedAt: poi.verified === false ? null : new Date('2026-08-01T00:00:00.000Z'),
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

export const SEEDED_PLANNER_POI_IDS = YEREVAN_POIS.map((poi) => poi.id);
