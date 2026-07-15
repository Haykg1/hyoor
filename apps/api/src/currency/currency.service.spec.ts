import type { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';
import type { RedisService } from '../redis/redis.service';

import { CURRENCY_RATES_CACHE_KEY } from './currency.constants';
import { CurrencyService, type CurrencyRates } from './currency.service';

const sampleRates: CurrencyRates = {
  base: 'USD',
  rates: { USD: 1, EUR: 0.92, GBP: 0.79, PLN: 4.0, AMD: 400, RUB: 90 },
  fetchedAt: '2026-01-01T00:00:00.000Z',
};

function buildService(overrides?: {
  isConfigured?: boolean;
  get?: jest.Mock;
  setWithTtl?: jest.Mock;
}): { service: CurrencyService; redis: RedisService } {
  const redis = {
    isConfigured: overrides?.isConfigured ?? true,
    get: overrides?.get ?? jest.fn().mockResolvedValue(null),
    setWithTtl: overrides?.setWithTtl ?? jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisService;
  const config = {
    get: jest.fn().mockReturnValue('https://open.er-api.com/v6/latest/USD'),
  } as unknown as ConfigService<AppConfig, true>;
  return { service: new CurrencyService(redis, config), redis };
}

describe('CurrencyService', () => {
  describe('convert', () => {
    it('returns the same amount when currencies match', () => {
      const { service } = buildService();
      expect(service.convert(100, 'USD', 'USD', sampleRates)).toBe(100);
    });

    it('converts via the USD pivot', () => {
      const { service } = buildService();
      const result = service.convert(100, 'USD', 'EUR', sampleRates);
      expect(result).toBeCloseTo(92);
    });

    it('cross-converts between two non-USD currencies', () => {
      const { service } = buildService();
      const result = service.convert(400, 'AMD', 'EUR', sampleRates);
      expect(result).toBeCloseTo((400 / 400) * 0.92);
    });

    it('returns null when a currency is missing from the rate table', () => {
      const { service } = buildService();
      expect(service.convert(100, 'USD', 'BYN', sampleRates)).toBeNull();
    });
  });

  describe('resolveDisplayCurrency', () => {
    it.each([
      ['AM', 'AMD'],
      ['RU', 'RUB'],
      ['GE', 'GEL'],
      ['BY', 'BYN'],
      ['UA', 'UAH'],
      ['PL', 'PLN'],
      ['GB', 'GBP'],
      ['TR', 'TRY'],
      ['DE', 'EUR'],
      ['FR', 'EUR'],
    ])('maps country %s to %s', (country, expected) => {
      const { service } = buildService();
      expect(service.resolveDisplayCurrency(country)).toBe(expected);
    });

    it('falls back to USD for unmapped or missing countries', () => {
      const { service } = buildService();
      expect(service.resolveDisplayCurrency('JP')).toBe('USD');
      expect(service.resolveDisplayCurrency(null)).toBe('USD');
    });

    it('is case-insensitive', () => {
      const { service } = buildService();
      expect(service.resolveDisplayCurrency('am')).toBe('AMD');
    });
  });

  describe('getRates', () => {
    it('returns null when Redis is not configured', async () => {
      const { service } = buildService({ isConfigured: false });
      expect(await service.getRates()).toBeNull();
    });

    it('returns null when nothing is cached', async () => {
      const { service } = buildService({ get: jest.fn().mockResolvedValue(null) });
      expect(await service.getRates()).toBeNull();
    });

    it('parses the cached JSON payload', async () => {
      const { service } = buildService({
        get: jest.fn().mockResolvedValue(JSON.stringify(sampleRates)),
      });
      expect(await service.getRates()).toEqual(sampleRates);
    });
  });

  describe('refreshRates', () => {
    it('keeps rates in memory when Redis is not configured', async () => {
      const { service, redis } = buildService({ isConfigured: false });
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'USD',
          rates: sampleRates.rates,
        }),
      } as Response);
      await service.refreshRates();
      expect(redis.setWithTtl).not.toHaveBeenCalled();
      expect(await service.getRates()).toMatchObject({
        base: 'USD',
        rates: expect.objectContaining({ AMD: 400, EUR: 0.92 }),
      });
      fetchMock.mockRestore();
    });

    it('fetches, filters to the curated set, and caches the result', async () => {
      const setWithTtl = jest.fn().mockResolvedValue(undefined);
      const { service } = buildService({ setWithTtl });
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'USD',
          rates: { ...sampleRates.rates, JPY: 150, BYN: 3.2 },
        }),
      } as Response);
      await service.refreshRates();
      expect(setWithTtl).toHaveBeenCalledTimes(1);
      const [key, value] = setWithTtl.mock.calls[0] as [string, string, number];
      expect(key).toBe(CURRENCY_RATES_CACHE_KEY);
      const parsed = JSON.parse(value) as CurrencyRates;
      expect(parsed.rates.BYN).toBe(3.2);
      expect(parsed.rates).not.toHaveProperty('JPY');
      fetchMock.mockRestore();
    });

    it('throws when the provider responds with a non-success result', async () => {
      const { service } = buildService();
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, json: async () => ({ result: 'error' }) } as Response);
      await expect(service.refreshRates()).rejects.toThrow();
      fetchMock.mockRestore();
    });
  });
});
