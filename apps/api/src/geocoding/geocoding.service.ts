import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AddressLocale,
  GeocodingSearchLevel,
  PlaceResult,
  PropertyAddressLabels,
  YandexGeocodingLang,
} from '@repo/shared';
import { placeResultToAddressLabel, YandexGeocodingLangs } from '@repo/shared';

import type { AppConfig } from '../config/configuration';

const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';
const ARMENIA_BBOX = '43.44,38.84~46.64,41.30';
const YANDEX_LANG_TO_LOCALE: Record<YandexGeocodingLang, AddressLocale> = {
  hy_AM: 'hy',
  ru_RU: 'ru',
  en_US: 'en',
};

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

  async searchPlaces(
    query: string,
    level: GeocodingSearchLevel = 'any',
    lang: YandexGeocodingLang = 'en_US',
  ): Promise<PlaceResult[]> {
    const members = await this.fetchGeoObjects(query.trim(), lang, 10);
    const places = members
      .map((geoObject) => this.toPlaceResult(geoObject))
      .filter((place): place is PlaceResult => place !== null);
    if (level === 'house') {
      return places.filter((p) => p.placeKind === 'house' && Boolean(p.buildingNumber));
    }
    return places;
  }

  async reverseGeocode(
    lat: number,
    lng: number,
    lang: YandexGeocodingLang,
  ): Promise<PlaceResult | null> {
    const members = await this.fetchGeoObjects(`${lng},${lat}`, lang, 1);
    const geoObject = members[0];
    if (!geoObject) return null;
    return this.toPlaceResult(geoObject);
  }

  async resolveAddressLabels(lat: number, lng: number): Promise<PropertyAddressLabels> {
    const results = await Promise.all(
      YandexGeocodingLangs.map(async (lang) => {
        const place = await this.reverseGeocode(lat, lng, lang);
        if (!place) {
          throw new ServiceUnavailableException(
            `Geocoding provider returned no result for locale ${lang}`,
          );
        }
        return { locale: YANDEX_LANG_TO_LOCALE[lang], label: placeResultToAddressLabel(place) };
      }),
    );
    return results.reduce((acc, { locale, label }) => {
      acc[locale] = label;
      return acc;
    }, {} as PropertyAddressLabels);
  }

  private async fetchGeoObjects(
    geocode: string,
    lang: YandexGeocodingLang,
    results: number,
  ): Promise<YandexGeoObject[]> {
    const apiKey = this.config.get('yandex.mapsApiKey', { infer: true });
    if (!apiKey) {
      throw new ServiceUnavailableException('Geocoding service is not configured');
    }
    const url = new URL(YANDEX_GEOCODER_URL);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('geocode', geocode);
    url.searchParams.set('lang', lang);
    url.searchParams.set('format', 'json');
    url.searchParams.set('results', String(results));
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
    return (data.response?.GeoObjectCollection?.featureMember ?? []).map((m) => m.GeoObject);
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
