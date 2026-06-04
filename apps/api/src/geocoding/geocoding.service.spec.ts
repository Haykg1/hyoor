import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

import { GeocodingService } from './geocoding.service';

const yandexFixture = {
  response: {
    GeoObjectCollection: {
      featureMember: [
        {
          GeoObject: {
            name: 'Azatutyan Street, 11',
            description: 'Noramarg village, Ararat Region, Armenia',
            Point: { pos: '44.416256 40.026135' },
            metaDataProperty: {
              GeocoderMetaData: {
                kind: 'house',
                text: 'Armenia, Ararat Region, Noramarg village, Azatutyan Street, 11',
                Address: {
                  country_code: 'AM',
                  formatted: 'Armenia, Ararat Region, Noramarg village, Azatutyan Street, 11',
                  Components: [
                    { kind: 'country', name: 'Armenia' },
                    { kind: 'province', name: 'Ararat Region' },
                    { kind: 'locality', name: 'Noramarg village' },
                    { kind: 'street', name: 'Azatutyan Street' },
                    { kind: 'house', name: '11' },
                  ],
                },
              },
            },
          },
        },
        {
          GeoObject: {
            name: 'Azatutyan Street',
            description: 'Noramarg village, Ararat Region, Armenia',
            Point: { pos: '44.416256 40.026135' },
            metaDataProperty: {
              GeocoderMetaData: {
                kind: 'street',
                text: 'Armenia, Ararat Region, Noramarg village, Azatutyan Street',
                Address: {
                  country_code: 'AM',
                  formatted: 'Armenia, Ararat Region, Noramarg village, Azatutyan Street',
                  Components: [
                    { kind: 'country', name: 'Armenia' },
                    { kind: 'province', name: 'Ararat Region' },
                    { kind: 'locality', name: 'Noramarg village' },
                    { kind: 'street', name: 'Azatutyan Street' },
                  ],
                },
              },
            },
          },
        },
      ],
    },
  },
};

describe('GeocodingService', () => {
  let service: GeocodingService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    const config = {
      get: jest.fn().mockReturnValue('test-api-key'),
    } as unknown as ConfigService<AppConfig, true>;
    service = new GeocodingService(config);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('returns mapped places with structured address fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => yandexFixture,
    } as Response);
    const places = await service.searchPlaces('Azatutyan 11');
    expect(places).toHaveLength(2);
    expect(places[0]).toEqual({
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
    });
    expect(places[1]?.placeKind).toBe('street');
    expect(places[1]?.buildingNumber).toBeNull();
  });

  it('filters to house-level results when level is house', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => yandexFixture,
    } as Response);
    const places = await service.searchPlaces('Azatutyan 11', 'house');
    expect(places).toHaveLength(1);
    expect(places[0]?.placeKind).toBe('house');
    expect(places[0]?.buildingNumber).toBe('11');
  });

  it('returns an empty array when featureMember is absent', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: { GeoObjectCollection: {} } }),
    } as Response);
    const places = await service.searchPlaces('Yerevan');
    expect(places).toEqual([]);
  });

  it('throws ServiceUnavailableException on provider HTTP error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);
    await expect(service.searchPlaces('Yerevan')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('forwards lang to the Yandex geocoder URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: { GeoObjectCollection: {} } }),
    } as Response);
    await service.searchPlaces('Yerevan', 'any', 'hy_AM');
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('lang=hy_AM');
  });

  it('reverseGeocodes coordinates with the requested language', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => yandexFixture,
    } as Response);
    const place = await service.reverseGeocode(40.026135, 44.416256, 'ru_RU');
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('geocode=44.416256%2C40.026135');
    expect(calledUrl).toContain('lang=ru_RU');
    expect(calledUrl).toContain('results=1');
    expect(place?.buildingNumber).toBe('11');
    expect(place?.street).toBe('Azatutyan Street');
  });

  it('resolveAddressLabels returns hy, ru, and en labels from parallel reverse geocode calls', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const lang = new URL(url).searchParams.get('lang');
      const streetByLang: Record<string, string> = {
        hy_AM: 'Azatutyan Street (hy)',
        ru_RU: 'Azatutyan Street (ru)',
        en_US: 'Azatutyan Street',
      };
      const street = streetByLang[lang ?? 'en_US'] ?? 'Azatutyan Street';
      return {
        ok: true,
        json: async () => ({
          response: {
            GeoObjectCollection: {
              featureMember: [
                {
                  GeoObject: {
                    ...yandexFixture.response.GeoObjectCollection.featureMember[0]?.GeoObject,
                    metaDataProperty: {
                      GeocoderMetaData: {
                        ...yandexFixture.response.GeoObjectCollection.featureMember[0]?.GeoObject
                          .metaDataProperty.GeocoderMetaData,
                        text: `Armenia, Ararat Region, Noramarg village, ${street}, 11`,
                        Address: {
                          country_code: 'AM',
                          formatted: `Armenia, Ararat Region, Noramarg village, ${street}, 11`,
                          Components: [
                            { kind: 'country', name: 'Armenia' },
                            { kind: 'province', name: 'Ararat Region' },
                            { kind: 'locality', name: 'Noramarg village' },
                            { kind: 'street', name: street },
                            { kind: 'house', name: '11' },
                          ],
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        }),
      } as Response;
    });
    const labels = await service.resolveAddressLabels(40.026135, 44.416256);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(labels.hy.street).toBe('Azatutyan Street (hy)');
    expect(labels.ru.street).toBe('Azatutyan Street (ru)');
    expect(labels.en.street).toBe('Azatutyan Street');
    expect(labels.en.formattedAddress).toContain('Azatutyan Street, 11');
  });

  it('resolveAddressLabels throws when reverse geocode returns no result', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: { GeoObjectCollection: {} } }),
    } as Response);
    await expect(service.resolveAddressLabels(40.026135, 44.416256)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
