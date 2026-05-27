import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Notification, NotificationType } from '@repo/database/client';
import type { PaginatedResponse } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';

import { QueryNotificationsDto } from './dto/query-notifications.dto';

interface NotificationContent {
  title: string;
  body?: string;
  refType?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(
    userId: string,
    type: NotificationType,
    refId?: string,
    refType?: string,
  ): Promise<Notification> {
    const content = this.buildContent(type);
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title: content.title,
        body: content.body,
        refId,
        refType: refType ?? content.refType,
      },
    });
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

  private buildContent(type: NotificationType): NotificationContent {
    switch (type) {
      case 'BOOKING_REQUEST':
        return {
          title: 'New booking request',
          body: 'You have a new booking request for your property.',
          refType: 'booking',
        };
      case 'BOOKING_CONFIRMED':
        return {
          title: 'Booking confirmed',
          body: 'Your booking request has been confirmed by the host.',
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
      default:
        return { title: 'Notification' };
    }
  }
}
