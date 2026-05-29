import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeocodingSearchLevel, PlaceResult } from '@repo/shared';

import type { AppConfig } from '../config/configuration';

const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';
const ARMENIA_BBOX = '43.44,38.84~46.64,41.30';

interface YandexAddressComponent {
  kind: string;
  name: string;
}

interface YandexGeoObject {
  name: string;
  description?: string;
  Point?: { pos: string };
  metaDataProperty: {
    GeocoderMetaData: {
      kind: string;
      text: string;
      Address?: {
        country_code?: string;
        formatted?: string;
        Components?: YandexAddressComponent[];
      };
    };
  };
}

interface YandexGeocodeResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject: YandexGeoObject;
      }>;
    };
  };
}

interface ParsedComponents {
  region: string | null;
  city: string | null;
  street: string | null;
  buildingNumber: string | null;
}

function normalizeRegion(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+Region$/i, '').trim() || null;
}

function parseComponents(components: YandexAddressComponent[] | undefined): ParsedComponents {
  if (!components?.length) {
    return { region: null, city: null, street: null, buildingNumber: null };
  }
  const find = (kind: string): string | null =>
    components.find((c) => c.kind === kind)?.name?.trim() ?? null;
  const province = find('province');
  const locality = find('locality') ?? find('area') ?? find('district');
  return {
    region: normalizeRegion(province),
    city: locality,
    street: find('street'),
    buildingNumber: find('house'),
  };
}

@Injectable()
export class GeocodingService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async searchPlaces(query: string, level: GeocodingSearchLevel = 'any'): Promise<PlaceResult[]> {
    const apiKey = this.config.get('yandex.mapsApiKey', { infer: true });
    if (!apiKey) {
      throw new ServiceUnavailableException('Geocoding service is not configured');
    }
    const url = new URL(YANDEX_GEOCODER_URL);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('geocode', query.trim());
    url.searchParams.set('lang', 'en_US');
    url.searchParams.set('format', 'json');
    url.searchParams.set('results', '10');
    url.searchParams.set('bbox', ARMENIA_BBOX);
    url.searchParams.set('rspn', '1');
    let response: Response;
    try {
      response = await fetch(url.toString());
    } catch {
      throw new ServiceUnavailableException('Geocoding provider is unavailable');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Geocoding provider returned an error');
    }
    const data = (await response.json()) as YandexGeocodeResponse;
    const members = data.response?.GeoObjectCollection?.featureMember ?? [];
    const places = members
      .map((member) => this.toPlaceResult(member.GeoObject))
      .filter((place): place is PlaceResult => place !== null);
    if (level === 'house') {
      return places.filter((p) => p.placeKind === 'house' && Boolean(p.buildingNumber));
    }
    return places;
  }

  private toPlaceResult(geoObject: YandexGeoObject): PlaceResult | null {
    const countryCode =
      geoObject.metaDataProperty.GeocoderMetaData.Address?.country_code?.toUpperCase();
    if (countryCode && countryCode !== 'AM') {
      return null;
    }
    const pos = geoObject.Point?.pos;
    if (!pos) {
      return null;
    }
    const [lngRaw, latRaw] = pos.split(' ');
    if (lngRaw === undefined || latRaw === undefined) {
      return null;
    }
    const lng = Number.parseFloat(lngRaw);
    const lat = Number.parseFloat(latRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const meta = geoObject.metaDataProperty.GeocoderMetaData;
    const components = parseComponents(meta.Address?.Components);
    const formattedAddress = meta.text || meta.Address?.formatted || geoObject.name;
    return {
      name: geoObject.name,
      fullName: formattedAddress,
      description: geoObject.description ?? formattedAddress,
      lat,
      lng,
      country: countryCode ?? 'AM',
      region: components.region,
      city: components.city,
      street: components.street,
      buildingNumber: components.buildingNumber,
      formattedAddress,
      placeKind: meta.kind,
    };
  }
}
