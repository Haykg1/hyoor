import type { ListNotificationsQuery, NotificationItem, PaginatedResponse } from '@repo/shared';

import { api } from '@/lib/api';

function setOptionalNumber(query: URLSearchParams, key: string, value: number | undefined): void {
  if (value !== undefined) query.set(key, String(value));
}

function mapNotification(row: NotificationItem): NotificationItem {
  return {
    ...row,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : String(row.createdAt),
    readAt: row.readAt ? String(row.readAt) : null,
  };
}

export async function listNotifications(
  params: ListNotificationsQuery = {},
): Promise<PaginatedResponse<NotificationItem>> {
  const query = new URLSearchParams();
  setOptionalNumber(query, 'page', params.page);
  setOptionalNumber(query, 'limit', params.limit);
  if (params.onlyUnread) query.set('onlyUnread', 'true');
  const qs = query.toString();
  const res = await api.get<PaginatedResponse<NotificationItem>>(
    `/notifications${qs ? `?${qs}` : ''}`,
  );
  return { ...res, data: res.data.map(mapNotification) };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await api.get<{ count: number }>('/notifications/unread-count');
  return res.count;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const row = await api.patch<NotificationItem>(`/notifications/${id}/read`, {});
  return mapNotification(row);
}

export async function markNotificationUnread(id: string): Promise<NotificationItem> {
  const row = await api.patch<NotificationItem>(`/notifications/${id}/unread`, {});
  return mapNotification(row);
}

export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  return api.patch<{ updatedCount: number }>('/notifications/read-all', {});
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

export async function clearAllNotifications(): Promise<{ deletedCount: number }> {
  return api.delete<{ deletedCount: number }>('/notifications');
}
