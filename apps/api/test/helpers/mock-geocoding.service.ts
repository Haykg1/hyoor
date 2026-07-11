import { Injectable } from '@nestjs/common';
import type { PlaceResult, PropertyAddressLabels } from '@repo/shared';

/**
 * Stands in for the real Yandex-backed GeocodingService in e2e tests — no live network
 * call, deterministic output regardless of input coordinates. The real service is
 * covered by its own unit spec (geocoding.service.spec.ts); e2e specs exercise the
 * property/booking business logic, not the Yandex integration itself.
 */
@Injectable()
export class MockGeocodingService {
  private toPlaceResult(): PlaceResult {
    return {
      name: 'Azatutyan Street, 11',
      fullName: 'Armenia, Ararat Region, Noramarg village, Azatutyan Street, 11',
      description: 'Noramarg village, Ararat Region, Armenia',
      lat: 40.026135,
      lng: 44.416256,
      country: 'AM',
      region: 'Ararat',
      city: 'Noramarg village',
      street: 'Azatutyan Street',
      buildingNumber: '11',
      formattedAddress: 'Armenia, Ararat Region, Noramarg village, Azatutyan Street, 11',
      placeKind: 'house',
    };
  }

  async searchPlaces(): Promise<PlaceResult[]> {
    return [this.toPlaceResult()];
  }

  async reverseGeocode(): Promise<PlaceResult | null> {
    return this.toPlaceResult();
  }

  async resolveAddressLabels(): Promise<PropertyAddressLabels> {
    return {
      en: {
        city: 'Noramarg village',
        region: 'Ararat',
        street: 'Azatutyan Street',
        formattedAddress: 'Armenia, Ararat Region, Noramarg village, Azatutyan Street, 11',
      },
      hy: {
        city: 'Նորամարգ գյուղ',
        region: 'Արարատի մարզ',
        street: 'Ազատության փողոց',
        formattedAddress: 'Հայաստան, Արարատի մարզ, Նորամարգ գյուղ, Ազատության փողոց, 11',
      },
      ru: {
        city: 'село Норамарг',
        region: 'Араратская область',
        street: 'улица Азатутян',
        formattedAddress: 'Армения, Араратская область, село Норамарг, улица Азатутян, 11',
      },
    };
  }
}
