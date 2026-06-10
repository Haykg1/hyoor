import type { Notification } from '@repo/database/client';
import type { NotificationItem } from '@repo/shared';

export function toNotificationItem(notification: Notification): NotificationItem {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    isRead: notification.isRead,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    refId: notification.refId,
    refType: notification.refType,
    createdAt: notification.createdAt.toISOString(),
  };
}
