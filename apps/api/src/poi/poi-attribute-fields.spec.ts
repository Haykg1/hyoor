import { poiAttributeFieldVisible, prunePoiAttributes } from '@repo/shared';

describe('poiAttributeFieldVisible', () => {
  it('hides food/drink fields for a church', () => {
    expect(poiAttributeFieldVisible('averageMealAmd', 'church')).toBe(false);
    expect(poiAttributeFieldVisible('websiteMenu', 'church')).toBe(false);
    expect(poiAttributeFieldVisible('servesAlcohol', 'church')).toBe(false);
    expect(poiAttributeFieldVisible('priceBand', 'church')).toBe(false);
  });

  it('always shows duration, hours and website', () => {
    for (const category of ['church', 'park', 'viewpoint', 'restaurant']) {
      expect(poiAttributeFieldVisible('typicalDurationMin', category)).toBe(true);
      expect(poiAttributeFieldVisible('openingHoursNote', category)).toBe(true);
      expect(poiAttributeFieldVisible('website', category)).toBe(true);
    }
  });

  it('shows the full food set for restaurants and wineries', () => {
    for (const category of ['restaurant', 'cafe', 'winery']) {
      expect(poiAttributeFieldVisible('averageMealAmd', category)).toBe(true);
      expect(poiAttributeFieldVisible('servesAlcohol', category)).toBe(true);
      expect(poiAttributeFieldVisible('websiteMenu', category)).toBe(true);
      expect(poiAttributeFieldVisible('priceBand', category)).toBe(true);
    }
  });

  it('shows a ticket price for museums and factories but not a menu', () => {
    expect(poiAttributeFieldVisible('priceBand', 'museum')).toBe(true);
    expect(poiAttributeFieldVisible('websiteMenu', 'museum')).toBe(false);
    expect(poiAttributeFieldVisible('averageMealAmd', 'museum')).toBe(false);
  });
});

describe('prunePoiAttributes', () => {
  it('drops values that do not belong to the category', () => {
    const pruned = prunePoiAttributes(
      {
        averageMealAmd: 6000,
        servesAlcohol: true,
        priceBand: 'mid',
        typicalDurationMin: 30,
        openingHoursNote: '09:00-18:00',
      },
      'church',
    );
    expect(pruned).toEqual({ typicalDurationMin: 30, openingHoursNote: '09:00-18:00' });
  });

  it('keeps the full set for a restaurant', () => {
    const attrs = {
      averageMealAmd: 6000,
      servesAlcohol: true,
      priceBand: 'mid' as const,
      websiteMenu: 'https://x/menu',
    };
    expect(prunePoiAttributes(attrs, 'restaurant')).toEqual(attrs);
  });
});
