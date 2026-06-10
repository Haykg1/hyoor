export const NOTIFICATION_TYPES = [
  'BOOKING_REQUEST',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'NEW_MESSAGE',
  'NEW_REVIEW',
  'PAYOUT_SENT',
  'PROPERTY_PROMOTION',
] as const;
export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationTypeValue;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: string | null;
  refId: string | null;
  refType: string | null;
  createdAt: string;
}

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  onlyUnread?: boolean;
}

export interface NotificationCreatedSsePayload {
  notification: NotificationItem;
}
