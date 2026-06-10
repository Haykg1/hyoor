import { EventEmitter } from 'node:events';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Notification } from '@repo/database/client';
import {
  buildNotificationChannel,
  NOTIFICATION_SSE_EVENT,
  type NotificationCreatedSsePayload,
} from '@repo/shared';
import { Observable } from 'rxjs';

import { RedisService } from '../redis/redis.service';

import { toNotificationItem } from './notification.mapper';

const SSE_HEARTBEAT_MS = 30_000;

@Injectable()
export class NotificationRealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationRealtimeService.name);
  private readonly localBus = new EventEmitter();

  constructor(private readonly redis: RedisService) {}

  async publishCreated(notification: Notification): Promise<void> {
    const item = toNotificationItem(notification);
    const channel = buildNotificationChannel(notification.userId);
    const payload: NotificationCreatedSsePayload = { notification: item };
    const message = JSON.stringify(payload);
    if (this.redis.isConfigured) {
      await this.redis.publish(channel, message);
      return;
    }
    this.localBus.emit(channel, message);
  }

  streamForUser(userId: string): Observable<MessageEvent> {
    const channel = buildNotificationChannel(userId);
    return new Observable<MessageEvent>((subscriber) => {
      const forwardMessage = (message: string): void => {
        subscriber.next({
          type: NOTIFICATION_SSE_EVENT,
          data: message,
        });
      };
      const heartbeat = setInterval(() => {
        subscriber.next({ data: 'ping' });
      }, SSE_HEARTBEAT_MS);
      if (this.redis.isConfigured) {
        void this.redis.subscribe(channel, forwardMessage).catch((err: Error) => {
          this.logger.error(`Redis subscribe failed for ${channel}: ${err.message}`);
          subscriber.error(err);
        });
      } else {
        this.localBus.on(channel, forwardMessage);
      }
      return () => {
        clearInterval(heartbeat);
        if (this.redis.isConfigured) {
          void this.redis.unsubscribe(channel, forwardMessage);
          return;
        }
        this.localBus.off(channel, forwardMessage);
      };
    });
  }

  onModuleDestroy(): void {
    this.localBus.removeAllListeners();
  }
}
