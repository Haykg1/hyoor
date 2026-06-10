import {
  NOTIFICATION_SSE_EVENT,
  type NotificationCreatedSsePayload,
  type NotificationItem,
} from '@repo/shared';

import { getAccessTokenFromCookie } from '@/lib/auth-cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface NotificationStreamHandlers {
  onNotification: (notification: NotificationItem) => void;
  onError?: () => void;
}

export function connectNotificationStream(handlers: NotificationStreamHandlers): () => void {
  const accessToken = getAccessTokenFromCookie();
  if (!accessToken || typeof window === 'undefined') {
    return () => undefined;
  }
  const params = new URLSearchParams({ access_token: accessToken });
  const source = new EventSource(`${API_BASE_URL}/notifications/stream?${params.toString()}`);
  const handleNotification = (event: MessageEvent<string>): void => {
    try {
      const payload = JSON.parse(event.data) as NotificationCreatedSsePayload;
      handlers.onNotification(payload.notification);
    } catch {
      handlers.onError?.();
    }
  };
  source.addEventListener(NOTIFICATION_SSE_EVENT, handleNotification as EventListener);
  source.onerror = () => {
    handlers.onError?.();
  };
  return () => {
    source.removeEventListener(NOTIFICATION_SSE_EVENT, handleNotification as EventListener);
    source.close();
  };
}
