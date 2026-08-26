import type { PropertySummary } from '@repo/shared';

import { buildPropertyPageUrl, buildSearchPageUrl, toListingCard } from './mcp-listing.mapper';

describe('mcp-listing.mapper', () => {
  it('builds locale listing urls and falls back to en', () => {
    expect(buildPropertyPageUrl('http://localhost:3000', 'en', 'abc')).toBe(
      'http://localhost:3000/en/property/abc',
    );
    expect(buildPropertyPageUrl('http://localhost:3000/', 'hy', 'abc')).toBe(
      'http://localhost:3000/hy/property/abc',
    );
    expect(buildPropertyPageUrl('http://localhost:3000', 'fr', 'abc')).toBe(
      'http://localhost:3000/en/property/abc',
    );
  });

  it('builds localized search urls', () => {
    expect(buildSearchPageUrl('http://localhost:3000', 'ru', '/search?city=Yerevan')).toBe(
      'http://localhost:3000/ru/search?city=Yerevan',
    );
  });

  it('maps a property summary to a compact listing card', () => {
    const property: PropertySummary = {
      id: 'p1',
      title: 'Yerevan loft',
      slug: 'yerevan-loft',
      propertyType: 'APARTMENT',
      city: 'Yerevan',
      region: 'Yerevan',
      country: 'AM',
      pricePerNight: 25000,
      currency: 'AMD',
      coverPhotoUrl: 'https://cdn.example/cover.jpg',
      maxGuests: 2,
      bedrooms: 1,
      avgRating: 4.8,
      reviewCount: 3,
      featured: false,
    };
    const card = toListingCard(property, 'http://localhost:3000/en/property/p1', {
      checkIn: '2026-09-01',
      checkOut: '2026-09-03',
    });
    expect(card).toMatchObject({
      id: 'p1',
      title: 'Yerevan loft',
      city: 'Yerevan',
      url: 'http://localhost:3000/en/property/p1',
      suggestedCheckIn: '2026-09-01',
      suggestedCheckOut: '2026-09-03',
    });
  });
});
