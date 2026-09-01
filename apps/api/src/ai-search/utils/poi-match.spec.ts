import { findDestinationPoiByQuery } from '@repo/shared';

describe('findDestinationPoiByQuery', () => {
  it('matches Republic Square in English', () => {
    const poi = findDestinationPoiByQuery('Republic Square');
    expect(poi?.id).toBe('republic_square');
    expect(poi?.latitude).toBeCloseTo(40.1785, 3);
    expect(poi?.longitude).toBeCloseTo(44.5156, 3);
  });

  it('matches Republic Square in Russian', () => {
    expect(findDestinationPoiByQuery('Площадь Республики')?.id).toBe('republic_square');
  });

  it('matches Republic Square in Armenian', () => {
    expect(findDestinationPoiByQuery('Հանրապետության հրապարակ')?.id).toBe('republic_square');
  });

  it('matches near-prefix and city-suffixed queries', () => {
    expect(findDestinationPoiByQuery('near Republic Square, Yerevan')?.id).toBe('republic_square');
    expect(findDestinationPoiByQuery('republic_square')?.id).toBe('republic_square');
  });

  it('returns null for bare city queries', () => {
    expect(findDestinationPoiByQuery('Yerevan')).toBeNull();
  });
});
