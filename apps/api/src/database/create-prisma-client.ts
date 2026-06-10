import { PrismaClient } from '@repo/database/client';

import { reconnectPrismaClient, runDbOperationWithReconnect } from './connection-retry';

export function createPrismaClientWithReconnect(): PrismaClient {
  const baseClient = new PrismaClient();
  const reconnect = async (): Promise<void> => {
    await reconnectPrismaClient(baseClient);
  };
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ query, args }) {
          return runDbOperationWithReconnect(() => query(args), reconnect);
        },
      },
    },
  }) as unknown as PrismaClient;
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClientWithReconnect>;
