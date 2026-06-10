import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Notification, NotificationType } from '@repo/database/client';
import type { PaginatedResponse } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';

import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationRealtimeService } from './notification-realtime.service';

interface NotificationContent {
  title: string;
  body?: string;
  refType?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: NotificationRealtimeService,
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
    await this.realtime.publishCreated(notification);
    return notification;
  }

  async findByUser(
    userId: string,
    dto: QueryNotificationsDto,
  ): Promise<PaginatedResponse<Notification>> {
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
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async markUnread(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: false, readAt: null },
    });
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
          refType: 'conversation',
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
      default:
        return { title: 'Notification' };
    }
  }
}
