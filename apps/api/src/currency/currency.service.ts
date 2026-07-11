import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';
import { RedisService } from '../redis/redis.service';

import {
  CACHED_CURRENCIES,
  CURRENCY_RATES_CACHE_KEY,
  CURRENCY_RATES_CACHE_TTL_SECONDS,
  resolveDisplayCurrencyForCountry,
} from './currency.constants';

export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
}

interface OpenErApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const existing = await this.getRates();
      if (!existing) {
        await this.refreshRates();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Initial currency rates fetch failed, will retry on next cron: ${message}`);
    }
  }

  async refreshRates(): Promise<void> {
    if (!this.redis.isConfigured) {
      this.logger.warn('REDIS_URL is not set — currency rate caching is disabled');
      return;
    }
    const url = this.config.get('currency.ratesApiUrl', { infer: true });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Currency rates provider returned ${response.status}`);
    }
    const data = (await response.json()) as OpenErApiResponse;
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Currency rates provider returned an unexpected payload');
    }
    const rates: Record<string, number> = {};
    for (const currency of CACHED_CURRENCIES) {
      const rate = data.rates[currency];
      if (typeof rate === 'number') {
        rates[currency] = rate;
      }
    }
    const payload: CurrencyRates = {
      base: data.base_code || 'USD',
      rates,
      fetchedAt: new Date().toISOString(),
    };
    await this.redis.setWithTtl(
      CURRENCY_RATES_CACHE_KEY,
      JSON.stringify(payload),
      CURRENCY_RATES_CACHE_TTL_SECONDS,
    );
  }

  async getRates(): Promise<CurrencyRates | null> {
    if (!this.redis.isConfigured) return null;
    const cached = await this.redis.get(CURRENCY_RATES_CACHE_KEY);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as CurrencyRates;
    } catch {
      return null;
    }
  }

  /** Cross-rate conversion via the USD pivot (`rates` values are units of X per 1 USD). */
  convert(amount: number, from: string, to: string, rates: CurrencyRates): number | null {
    if (from === to) return amount;
    const fromRate = from === rates.base ? 1 : rates.rates[from];
    const toRate = to === rates.base ? 1 : rates.rates[to];
    if (!fromRate || !toRate) return null;
    return (amount / fromRate) * toRate;
  }

  resolveDisplayCurrency(countryCode: string | null): string {
    return resolveDisplayCurrencyForCountry(countryCode);
  }
}
