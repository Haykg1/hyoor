import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@repo/database/client';

import {
  connectPrismaWithRetry,
  DB_HEALTH_CHECK_INTERVAL_MS,
  ensurePrismaConnection,
  reconnectPrismaClient,
} from './connection-retry';
import { createPrismaClientWithReconnect, type ExtendedPrismaClient } from './create-prisma-client';

const PrismaClientWithReconnect = class {
  constructor() {
    return createPrismaClientWithReconnect();
  }
} as new () => ExtendedPrismaClient;

@Injectable()
export class PrismaService
  extends PrismaClientWithReconnect
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private reconnecting = false;

  async onModuleInit(): Promise<void> {
    await connectPrismaWithRetry(this.asPrismaClient());
    this.startHealthCheck();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopHealthCheck();
    await this.$disconnect();
  }

  async reconnect(): Promise<void> {
    if (this.reconnecting) {
      return;
    }
    this.reconnecting = true;
    try {
      this.logger.warn('Reconnecting to PostgreSQL...');
      await reconnectPrismaClient(this.asPrismaClient());
      this.logger.log('PostgreSQL connection restored');
    } finally {
      this.reconnecting = false;
    }
  }

  private asPrismaClient(): PrismaClient {
    return this as unknown as PrismaClient;
  }

  private startHealthCheck(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.healthCheckTimer = setInterval(() => {
      void this.runHealthCheck();
    }, DB_HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck(): void {
    if (!this.healthCheckTimer) {
      return;
    }
    clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = null;
  }

  private async runHealthCheck(): Promise<void> {
    try {
      await ensurePrismaConnection(this.asPrismaClient());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown database error';
      this.logger.error(`PostgreSQL health check failed: ${message}`);
    }
  }
}
