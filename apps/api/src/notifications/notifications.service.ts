import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Notification, NotificationType } from '@repo/database/client';
import type { NotificationItem, PaginatedResponse } from '@repo/shared';
import { DEFAULT_PAGE_SIZE, S3_PRESIGNED_URL_EXPIRES } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationRealtimeService } from './notification-realtime.service';
import { toNotificationItem } from './notification.mapper';

interface NotificationContent {
  title: string;
  body?: string;
  refType?: string;
}

type SenderProfileRow = {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarKey: string | null;
  } | null;
  hostProfile: {
    hostType: 'INDIVIDUAL' | 'COMPANY';
    companyName: string | null;
  } | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: NotificationRealtimeService,
    private readonly storage: StorageService,
  ) {}

  async notify(
    userId: string,
    type: NotificationType,
    refId?: string,
    refType?: string,
  ): Promise<Notification> {
    const content = this.buildContent(type);
    return this.notifyCustom(
      userId,
      type,
      content.title,
      content.body,
      refId,
      refType ?? content.refType,
    );
  }

  async notifyCustom(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    refId?: string,
    refType?: string,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        refId,
        refType,
      },
    });
    const item = await this.toItem(notification);
    await this.realtime.publishCreated(item);
    return notification;
  }

  async findByUser(
    userId: string,
    dto: QueryNotificationsDto,
  ): Promise<PaginatedResponse<NotificationItem>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(dto.onlyUnread ? { isRead: false } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    const items = await this.toItems(data);
    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<NotificationItem> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return this.toItem(updated);
  }

  async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async markUnread(id: string, userId: string): Promise<NotificationItem> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: false, readAt: null },
    });
    return this.toItem(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }
    await this.prisma.notification.delete({ where: { id } });
  }

  async removeAll(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.prisma.notification.deleteMany({ where: { userId } });
    return { deletedCount: result.count };
  }

  async toItem(notification: Notification): Promise<NotificationItem> {
    const [item] = await this.toItems([notification]);
    return item ?? toNotificationItem(notification);
  }

  private async toItems(notifications: Notification[]): Promise<NotificationItem[]> {
    if (notifications.length === 0) return [];
    const messageIds = [
      ...new Set(
        notifications
          .filter(
            (notification) =>
              notification.type === 'NEW_MESSAGE' &&
              notification.refType === 'message' &&
              Boolean(notification.refId),
          )
          .map((notification) => notification.refId as string),
      ),
    ];
    const senderByMessageId = new Map<string, SenderProfileRow>();
    if (messageIds.length > 0) {
      const messages = await this.prisma.message.findMany({
        where: { id: { in: messageIds } },
        select: {
          id: true,
          sender: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true, avatarKey: true } },
              hostProfile: { select: { hostType: true, companyName: true } },
            },
          },
        },
      });
      for (const message of messages) {
        senderByMessageId.set(message.id, message.sender);
      }
    }
    const uniqueSenders = [
      ...new Map([...senderByMessageId.values()].map((sender) => [sender.id, sender])).values(),
    ];
    const avatarByUserId = new Map<string, string | null>();
    await Promise.all(
      uniqueSenders.map(async (sender) => {
        avatarByUserId.set(sender.id, await this.resolveAvatarUrl(sender.profile?.avatarKey));
      }),
    );
    return notifications.map((notification) => {
      if (
        notification.type !== 'NEW_MESSAGE' ||
        notification.refType !== 'message' ||
        !notification.refId
      ) {
        return toNotificationItem(notification);
      }
      const sender = senderByMessageId.get(notification.refId);
      return toNotificationItem(notification, {
        actorAvatarUrl: sender ? (avatarByUserId.get(sender.id) ?? null) : null,
      });
    });
  }

  private async resolveAvatarUrl(avatarKey: string | null | undefined): Promise<string | null> {
    if (!avatarKey || !this.storage.isConfigured) return null;
    try {
      return await this.storage.getPresignedUrl(avatarKey, S3_PRESIGNED_URL_EXPIRES);
    } catch {
      return null;
    }
  }

  private buildContent(type: NotificationType): NotificationContent {
    switch (type) {
      case 'BOOKING_REQUEST':
        return {
          title: 'New reservation',
          body: 'A guest has booked your property.',
          refType: 'booking',
        };
      case 'BOOKING_CONFIRMED':
        return {
          title: 'Reservation confirmed',
          body: 'Your reservation is confirmed.',
          refType: 'booking',
        };
      case 'BOOKING_CANCELLED':
        return {
          title: 'Booking cancelled',
          body: 'A booking has been cancelled.',
          refType: 'booking',
        };
      case 'NEW_MESSAGE':
        return {
          title: 'New message',
          body: 'You have a new message.',
          refType: 'message',
        };
      case 'NEW_REVIEW':
        return {
          title: 'New review',
          body: 'You received a new review.',
          refType: 'review',
        };
      case 'PAYOUT_SENT':
        return {
          title: 'Payout sent',
          body: 'Your payout has been processed.',
          refType: 'payout',
        };
      case 'PROPERTY_PROMOTION':
        return {
          title: 'New deal on a saved property',
          body: 'A host posted a limited-time promotion on a property you saved.',
          refType: 'promotion',
        };
      case 'DEPOSIT_CLAIM_SUBMITTED':
        return {
          title: 'Security deposit claim submitted',
          body: 'A claim against a security deposit is awaiting review.',
          refType: 'booking',
        };
      case 'DEPOSIT_CLAIM_RESOLVED':
        return {
          title: 'Security deposit claim resolved',
          body: 'A security deposit claim has been reviewed.',
          refType: 'booking',
        };
      case 'DEPOSIT_RELEASED':
        return {
          title: 'Security deposit released',
          body: 'The hold on your security deposit has been released.',
          refType: 'booking',
        };
      default:
        return { title: 'Notification' };
    }
  }
}
