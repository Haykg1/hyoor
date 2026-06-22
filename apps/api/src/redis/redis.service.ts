import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AppConfig } from '../config/configuration';

import { attachRedisLifecycle, buildRedisConnectionOptions } from './redis-connection.options';

export interface GeoSearchResult {
  member: string;
  distanceKm: number;
}

type RedisMessageHandler = (message: string) => void;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly channelHandlers = new Map<string, Set<RedisMessageHandler>>();

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get('redis.url', { infer: true })?.trim());
  }

  async onModuleInit(): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn('REDIS_URL is not set — POI GEO features are disabled');
      return;
    }
    this.client = this.createConnection('client');
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (!this.client) {
      return;
    }
    await this.client.quit();
    this.client = null;
    this.channelHandlers.clear();
  }

  private createConnection(role: 'client' | 'subscriber'): Redis {
    const url = this.config.get('redis.url', { infer: true });
    const redis = new Redis(url, buildRedisConnectionOptions());
    attachRedisLifecycle(
      redis,
      role,
      (message) => this.logger.log(message),
      (message) => this.logger.warn(message),
      (message) => this.logger.error(message),
      role === 'subscriber'
        ? (connection: Redis): void => {
            void this.resubscribeAllChannels(connection);
          }
        : undefined,
    );
    return redis;
  }

  private async resubscribeAllChannels(subscriber: Redis): Promise<void> {
    const channels = [...this.channelHandlers.keys()];
    if (channels.length === 0) {
      return;
    }
    await subscriber.subscribe(...channels);
    this.logger.log(`Redis subscriber re-subscribed to ${channels.length} channel(s)`);
  }

  private getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis is not configured');
    }
    return this.client;
  }

  async zcard(key: string): Promise<number> {
    return this.getClient().zcard(key);
  }

  async geoAdd(
    key: string,
    entries: { longitude: number; latitude: number; member: string }[],
  ): Promise<void> {
    if (entries.length === 0) return;
    const args: (string | number)[] = [];
    for (const entry of entries) {
      args.push(entry.longitude, entry.latitude, entry.member);
    }
    await this.getClient().geoadd(key, ...args);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.getClient().hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.getClient().hget(key, field);
  }

  async setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.getClient().set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const client = this.getClient();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, ttlSeconds);
    }
    return count;
  }

  async incrByWithTtl(key: string, amount: number, ttlSeconds: number): Promise<number> {
    const client = this.getClient();
    const count = await client.incrby(key, amount);
    if (count === amount) {
      await client.expire(key, ttlSeconds);
    }
    return count;
  }

  async decr(key: string): Promise<number> {
    return this.getClient().decr(key);
  }

  async ttl(key: string): Promise<number> {
    return this.getClient().ttl(key);
  }

  async geoSearchNearest(
    key: string,
    longitude: number,
    latitude: number,
    radiusKm: number,
    count: number,
  ): Promise<GeoSearchResult[]> {
    return this.geoSearchByRadius(key, longitude, latitude, radiusKm, count);
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.isConfigured) return;
    await this.getClient().publish(channel, message);
  }

  private getSubscriber(): Redis {
    if (!this.isConfigured) {
      throw new Error('Redis is not configured');
    }
    if (!this.subscriber) {
      this.subscriber = this.createConnection('subscriber');
      this.subscriber.on('message', (incomingChannel, message) => {
        const handlers = this.channelHandlers.get(incomingChannel);
        if (!handlers) return;
        for (const handler of handlers) {
          handler(message);
        }
      });
    }
    return this.subscriber;
  }

  async subscribe(channel: string, handler: RedisMessageHandler): Promise<void> {
    if (!this.isConfigured) return;
    const subscriber = this.getSubscriber();
    if (!subscriber.status || subscriber.status === 'wait') {
      await subscriber.connect();
    }
    const handlers = this.channelHandlers.get(channel) ?? new Set<RedisMessageHandler>();
    const isFirstHandler = handlers.size === 0;
    handlers.add(handler);
    this.channelHandlers.set(channel, handlers);
    if (isFirstHandler) {
      await subscriber.subscribe(channel);
    }
  }

  async unsubscribe(channel: string, handler: RedisMessageHandler): Promise<void> {
    if (!this.isConfigured || !this.subscriber) return;
    const handlers = this.channelHandlers.get(channel);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size > 0) return;
    this.channelHandlers.delete(channel);
    await this.subscriber.unsubscribe(channel);
  }

  async geoSearchByRadius(
    key: string,
    longitude: number,
    latitude: number,
    radiusKm: number,
    count: number,
  ): Promise<GeoSearchResult[]> {
    const raw = await this.getClient().georadius(
      key,
      longitude,
      latitude,
      radiusKm,
      'km',
      'WITHDIST',
      'ASC',
      'COUNT',
      count,
    );
    return raw.map((row) => {
      const [member, distance] = row as [string, string];
      return { member, distanceKm: Number.parseFloat(distance) };
    });
  }
}
