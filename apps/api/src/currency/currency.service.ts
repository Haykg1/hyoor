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
  /** Fallback when Redis is unavailable so local/dev display conversion still works. */
  private memoryRates: CurrencyRates | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const fetchOnBoot = this.config.get('currency.fetchOnBoot', { infer: true });
    if (!fetchOnBoot) {
      this.logger.log('CURRENCY_RATES_FETCH_ON_BOOT is not true — skipping initial FX rates fetch');
      return;
    }
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
    this.memoryRates = payload;
    if (!this.redis.isConfigured) {
      this.logger.warn('REDIS_URL is not set — using in-memory currency rates');
      return;
    }
    try {
      await this.redis.setWithTtl(
        CURRENCY_RATES_CACHE_KEY,
        JSON.stringify(payload),
        CURRENCY_RATES_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Could not cache currency rates in Redis (${message}) — using memory`);
    }
  }

  async getRates(): Promise<CurrencyRates | null> {
    if (this.redis.isConfigured) {
      try {
        const cached = await this.redis.get(CURRENCY_RATES_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as CurrencyRates;
          this.memoryRates = parsed;
          return parsed;
        }
      } catch {
        // Redis client may not be connected yet during module init.
      }
    }
    return this.memoryRates;
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
