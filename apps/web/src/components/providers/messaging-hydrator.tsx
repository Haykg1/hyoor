'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth.store';
import { useMessagingStore } from '@/store/messaging.store';

export function MessagingHydrator(): null {
  const userId = useAuthStore((s) => s.user?.id);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrateConversations = useMessagingStore((s) => s.hydrateConversations);
  const clearStore = useMessagingStore((s) => s.clearStore);
  const connectRealtime = useMessagingStore((s) => s.connectRealtime);
  const disconnectRealtime = useMessagingStore((s) => s.disconnectRealtime);
  useEffect(() => {
    if (isLoading) return;
    if (userId) {
      void hydrateConversations();
      connectRealtime();
      return () => {
        disconnectRealtime();
      };
    }
    clearStore();
  }, [userId, isLoading, hydrateConversations, clearStore, connectRealtime, disconnectRealtime]);
  return null;
}
