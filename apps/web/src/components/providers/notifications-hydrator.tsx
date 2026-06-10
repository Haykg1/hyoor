'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';

export function NotificationsHydrator(): null {
  const userId = useAuthStore((s) => s.user?.id);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrate = useNotificationsStore((s) => s.hydrate);
  const clearStore = useNotificationsStore((s) => s.clearStore);
  const connectRealtime = useNotificationsStore((s) => s.connectRealtime);
  const disconnectRealtime = useNotificationsStore((s) => s.disconnectRealtime);
  useEffect(() => {
    if (isLoading) return;
    if (userId) {
      void hydrate();
      connectRealtime();
      return () => {
        disconnectRealtime();
      };
    }
    clearStore();
  }, [userId, isLoading, hydrate, clearStore, connectRealtime, disconnectRealtime]);
  return null;
}
