import type { Redis, RedisOptions } from 'ioredis';

import {
  CONNECTION_RETRY_BASE_DELAY_MS,
  CONNECTION_RETRY_MAX_DELAY_MS,
} from '../common/connection/retry';

export const REDIS_MAX_RECONNECT_ATTEMPTS = 50;

export function buildRedisConnectionOptions(): RedisOptions {
  return {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (attempt: number): number | null => {
      if (attempt > REDIS_MAX_RECONNECT_ATTEMPTS) {
        return null;
      }
      return Math.min(attempt * CONNECTION_RETRY_BASE_DELAY_MS, CONNECTION_RETRY_MAX_DELAY_MS);
    },
    reconnectOnError: (error: Error): boolean => {
      const message = error.message.toLowerCase();
      return message.includes('readonly') || message.includes('econnreset');
    },
  };
}

type RedisLifecycleRole = 'client' | 'subscriber';

export function attachRedisLifecycle(
  redis: Redis,
  role: RedisLifecycleRole,
  log: (message: string) => void,
  warn: (message: string) => void,
  error: (message: string) => void,
  onSubscriberReady?: (redis: Redis) => void,
): void {
  redis.on('connect', () => {
    log(`Redis ${role} connected`);
  });
  redis.on('ready', () => {
    log(`Redis ${role} ready`);
    onSubscriberReady?.(redis);
  });
  redis.on('reconnecting', (delayMs: number) => {
    warn(`Redis ${role} reconnecting in ${delayMs}ms`);
  });
  redis.on('close', () => {
    warn(`Redis ${role} connection closed`);
  });
  redis.on('error', (err: Error) => {
    error(`Redis ${role} error: ${err.message}`);
  });
  redis.on('end', () => {
    warn(`Redis ${role} connection ended`);
  });
}
