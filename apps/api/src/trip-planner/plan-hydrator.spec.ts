import type { PoiRecord } from '../poi/poi-mapper';

import { hydratePlan } from './plan-hydrator';
import { kindFor } from './poi-kind';
import type { ResolvedPlan } from './proposed-plan';

function poi(overrides: Partial<PoiRecord> & { id: string }): PoiRecord {
  return {
    id: overrides.id,
    city: 'Yerevan',
    region: 'Yerevan',
    country: 'AM',
    citySlug: 'yerevan',
    latitude: overrides.latitude ?? 40.18,
    longitude: overrides.longitude ?? 44.51,
    category: overrides.category ?? 'landmark',
    tags: overrides.tags ?? [],
    nameLabels: overrides.nameLabels ?? { en: overrides.id, hy: overrides.id, ru: overrides.id },
    descriptionLabels: overrides.descriptionLabels ?? {
      en: `${overrides.id} desc`,
      hy: '',
      ru: '',
    },
    wikipediaTitle: null,
    wikipediaUrl: null,
    attributes: overrides.attributes ?? {},
    status: 'PUBLISHED',
    usableInPlanner: true,
    lastVerifiedAt: overrides.lastVerifiedAt ?? null,
    sortOrder: overrides.sortOrder ?? 0,
  };
}

const PROPOSED: ResolvedPlan = {
  summary: 'A plan',
  days: [
    {
      theme: 'Day one',
      picks: [
        { poiId: 'museum', startTime: '09:30', endTime: '11:00', whyThisFits: 'history' },
        { poiId: 'tavern', startTime: '13:00', endTime: '14:30', whyThisFits: 'lunch' },
      ],
    },
  ],
};

describe('kindFor', () => {
  it('maps categories to item kinds', () => {
    expect(kindFor('church')).toBe('sight');
    expect(kindFor('restaurant')).toBe('meal');
    expect(kindFor('winery')).toBe('activity');
    expect(kindFor('unknown-thing')).toBe('sight');
  });
});

describe('hydratePlan', () => {
  const candidates = [
    poi({ id: 'museum', category: 'museum', lastVerifiedAt: new Date('2026-08-01T00:00:00Z') }),
    poi({
      id: 'tavern',
      category: 'restaurant',
      attributes: { priceBand: 'mid', averageMealAmd: 6000, openingHoursNote: '11:00-23:00' },
    }),
  ];

  it('fills item fields from the catalog and sets placeId', () => {
    const plan = hydratePlan({
      proposed: PROPOSED,
      candidates,
      dates: ['2026-09-10'],
      city: 'Yerevan',
      locale: 'en',
      photosByPoiId: new Map(),
    });
    const [museum, tavern] = plan.days[0]?.items ?? [];
    expect(museum?.placeId).toBe('museum');
    expect(museum?.kind).toBe('sight');
    expect(museum?.verifiedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(museum?.description).toBe('museum desc');
    expect(tavern?.kind).toBe('meal');
    expect(tavern?.claimedPricePerPerson).toEqual({ amount: 6000, currency: 'AMD', basis: 'meal' });
    expect(tavern?.claimedOpeningHours).toBe('11:00-23:00');
    expect(tavern?.verifiedAt).toBeNull();
  });

  it('attaches resolved photos by poi id', () => {
    const plan = hydratePlan({
      proposed: PROPOSED,
      candidates,
      dates: ['2026-09-10'],
      city: 'Yerevan',
      locale: 'en',
      photosByPoiId: new Map([
        ['museum', [{ url: 'https://cdn/x.jpg', attribution: 'By A', license: 'CC BY-SA 4.0' }]],
      ]),
    });
    expect(plan.days[0]?.items[0]?.photos[0]?.url).toBe('https://cdn/x.jpg');
    expect(plan.days[0]?.items[1]?.photos).toEqual([]);
  });
});
