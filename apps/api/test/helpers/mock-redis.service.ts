import type { GeoSearchResult } from '../../src/redis/redis.service';

interface GeoEntry {
  longitude: number;
  latitude: number;
  member: string;
}

const EARTH_RADIUS_KM = 6371;

function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const latDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
  const lngDelta = ((longitudeB - longitudeA) * Math.PI) / 180;
  const latARad = (latitudeA * Math.PI) / 180;
  const latBRad = (latitudeB * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latARad) * Math.cos(latBRad) * Math.sin(lngDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type RedisMessageHandler = (message: string) => void;

export class MockRedisService {
  readonly isConfigured = true;
  private readonly geoEntries = new Map<string, GeoEntry[]>();
  private readonly metaEntries = new Map<string, Map<string, string>>();
  private readonly channelHandlers = new Map<string, Set<RedisMessageHandler>>();
  private readonly kvEntries = new Map<string, { value: string; expiresAt: number }>();

  async onModuleInit(): Promise<void> {}

  async onModuleDestroy(): Promise<void> {}

  async zcard(key: string): Promise<number> {
    return this.geoEntries.get(key)?.length ?? 0;
  }

  async geoAdd(
    key: string,
    entries: { longitude: number; latitude: number; member: string }[],
  ): Promise<void> {
    const existing = this.geoEntries.get(key) ?? [];
    const byMember = new Map(existing.map((entry) => [entry.member, entry]));
    for (const entry of entries) {
      byMember.set(entry.member, entry);
    }
    this.geoEntries.set(key, [...byMember.values()]);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    const hash = this.metaEntries.get(key) ?? new Map<string, string>();
    hash.set(field, value);
    this.metaEntries.set(key, hash);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.metaEntries.get(key)?.get(field) ?? null;
  }

  async setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.kvEntries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.kvEntries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.kvEntries.delete(key);
      return null;
    }
    return entry.value;
  }

  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.kvEntries.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      this.kvEntries.set(key, { value: '1', expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    const next = Number.parseInt(entry.value, 10) + 1;
    entry.value = String(next);
    return next;
  }

  async incrByWithTtl(key: string, amount: number, ttlSeconds: number): Promise<number> {
    const entry = this.kvEntries.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      this.kvEntries.set(key, { value: String(amount), expiresAt: now + ttlSeconds * 1000 });
      return amount;
    }
    const next = Number.parseInt(entry.value, 10) + amount;
    entry.value = String(next);
    return next;
  }

  async del(key: string): Promise<void> {
    this.kvEntries.delete(key);
  }

  async decr(key: string): Promise<number> {
    const entry = this.kvEntries.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      return 0;
    }
    const next = Math.max(0, Number.parseInt(entry.value, 10) - 1);
    entry.value = String(next);
    return next;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.kvEntries.get(key);
    if (!entry) return -2;
    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.kvEntries.delete(key);
      return -2;
    }
    return Math.ceil(remainingMs / 1000);
  }

  clearKv(): void {
    this.kvEntries.clear();
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
    const handlers = this.channelHandlers.get(channel);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(message);
    }
  }

  async subscribe(channel: string, handler: RedisMessageHandler): Promise<void> {
    const handlers = this.channelHandlers.get(channel) ?? new Set<RedisMessageHandler>();
    handlers.add(handler);
    this.channelHandlers.set(channel, handlers);
  }

  async unsubscribe(channel: string, handler: RedisMessageHandler): Promise<void> {
    const handlers = this.channelHandlers.get(channel);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.channelHandlers.delete(channel);
    }
  }

  async geoSearchByRadius(
    key: string,
    longitude: number,
    latitude: number,
    radiusKm: number,
    count: number,
  ): Promise<GeoSearchResult[]> {
    const entries = this.geoEntries.get(key) ?? [];
    const hits = entries
      .map((entry) => ({
        member: entry.member,
        distanceKm: haversineKm(latitude, longitude, entry.latitude, entry.longitude),
      }))
      .filter((hit) => hit.distanceKm <= radiusKm)
      .sort((left, right) => left.distanceKm - right.distanceKm)
      .slice(0, count);
    return hits;
  }
}
