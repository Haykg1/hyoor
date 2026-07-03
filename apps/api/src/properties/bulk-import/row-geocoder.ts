import { Injectable, Logger } from '@nestjs/common';
import type { PlaceResult } from '@repo/shared';

import { GeocodingService } from '../../geocoding/geocoding.service';

export interface GeocodedAddress {
  street: string;
  buildingNumber: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeKind: string;
  addressLine: string;
}

@Injectable()
export class RowGeocoderService {
  private readonly logger = new Logger(RowGeocoderService.name);

  constructor(private readonly geocoding: GeocodingService) {}

  /**
   * Resolve a free-text address string to a verified house entry.
   * Returns null when no house-level result is found.
   */
  async resolveAddress(addressQuery: string): Promise<GeocodedAddress | null> {
    try {
      const places = await this.geocoding.searchPlaces(addressQuery, 'house', 'en_US');
      const house = places.find(
        (p): p is PlaceResult & { placeKind: 'house' } =>
          p.placeKind === 'house' && Boolean(p.buildingNumber),
      );
      if (!house) return null;
      const addressLine =
        house.street && house.buildingNumber
          ? `${house.street}, ${house.buildingNumber}`
          : house.formattedAddress;
      return {
        street: house.street ?? '',
        buildingNumber: house.buildingNumber ?? '',
        city: house.city ?? '',
        region: house.region,
        country: house.country || 'AM',
        latitude: house.lat,
        longitude: house.lng,
        formattedAddress: house.formattedAddress,
        placeKind: 'house',
        addressLine,
      };
    } catch (err) {
      this.logger.warn(`Geocoding failed for "${addressQuery}": ${(err as Error).message}`);
      return null;
    }
  }
}
