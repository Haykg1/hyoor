export const NOTIFICATION_SSE_EVENT = 'notification';

export function buildNotificationChannel(userId: string): string {
  return `notifications:user:${userId}`;
}
