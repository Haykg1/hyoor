import { findDestinationPoiByQuery } from '@repo/shared';

import {
  destinationPoiToResolvedLocation,
  NEAR_LANDMARK_RADIUS_KM,
  toExtractedFilters,
  toSearchPropertiesDto,
} from './ai-search-filters.mapper';

describe('curated landmark AI resolve', () => {
  it('maps Republic Square to landmark coords and 1.2 km radius', () => {
    const poi = findDestinationPoiByQuery('Republic Square, Yerevan');
    expect(poi).not.toBeNull();
    const location = destinationPoiToResolvedLocation(poi!);
    expect(location).toMatchObject({
      searchPlaceKind: 'landmark',
      searchLatitude: poi!.latitude,
      searchLongitude: poi!.longitude,
      searchRadiusKm: NEAR_LANDMARK_RADIUS_KM,
    });
    expect(location.searchCity).toBeUndefined();
    expect(location.city).toBeUndefined();
    const dto = toSearchPropertiesDto(
      { locationQuery: 'Republic Square, Yerevan', stayNights: 1 },
      location,
    );
    expect(dto.searchLatitude).toBe(poi!.latitude);
    expect(dto.searchLongitude).toBe(poi!.longitude);
    expect(dto.searchRadiusKm).toBe(1.2);
    expect(dto.searchCity).toBeUndefined();
    expect(dto.city).toBeUndefined();
    const filters = toExtractedFilters({ locationQuery: 'Republic Square, Yerevan' }, location);
    expect(filters.searchRadiusKm).toBe(1.2);
    expect(filters.searchCity).toBeUndefined();
  });
});
