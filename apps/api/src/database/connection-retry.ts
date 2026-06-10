import { Prisma, PrismaClient } from '@repo/database/client';

import { CONNECTION_MAX_ATTEMPTS, delay, retryBackoffMs } from '../common/connection/retry';

const TRANSIENT_PRISMA_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const TRANSIENT_SYSTEM_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
]);

export const DB_HEALTH_CHECK_INTERVAL_MS = 30_000;

export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_ERROR_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  const code = String((error as { code: string }).code);
  return TRANSIENT_SYSTEM_ERROR_CODES.has(code);
}

export async function connectPrismaWithRetry(
  client: PrismaClient,
  maxAttempts = CONNECTION_MAX_ATTEMPTS,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.$connect();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }
      await delay(retryBackoffMs(attempt));
    }
  }
  throw lastError;
}

export async function reconnectPrismaClient(client: PrismaClient): Promise<void> {
  await client.$disconnect().catch(() => undefined);
  await connectPrismaWithRetry(client);
}

export async function runDbOperationWithReconnect<T>(
  operation: () => Promise<T>,
  reconnect: () => Promise<void>,
  maxAttempts = CONNECTION_MAX_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === maxAttempts) {
        throw error;
      }
      await reconnect();
      await delay(retryBackoffMs(attempt));
    }
  }
  throw lastError;
}

export async function probePrismaConnection(client: PrismaClient): Promise<boolean> {
  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function ensurePrismaConnection(client: PrismaClient): Promise<void> {
  const isHealthy = await probePrismaConnection(client);
  if (isHealthy) {
    return;
  }
  await reconnectPrismaClient(client);
}
