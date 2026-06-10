import type { NotificationItem } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  clearAllNotifications,
  deleteNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from '@/lib/api/notifications';
import { connectNotificationStream } from '@/lib/notifications/stream';

const NOTIFICATIONS_PAGE_LIMIT = 30;

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  clearStore: () => void;
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  pushNotification: (notification: NotificationItem) => void;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

let realtimeDisconnect: (() => void) | null = null;

export const useNotificationsStore = create<NotificationsState>()(
  devtools(
    (set, get) => ({
      items: [],
      unreadCount: 0,
      isLoading: false,
      isHydrating: false,
      hydrate: async () => {
        set({ isHydrating: true });
        try {
          const [list, count] = await Promise.all([
            listNotifications({ limit: NOTIFICATIONS_PAGE_LIMIT }),
            getUnreadNotificationCount(),
          ]);
          set({ items: list.data, unreadCount: count, isHydrating: false });
        } catch {
          set({ items: [], unreadCount: 0, isHydrating: false });
        }
      },
      refresh: async () => {
        set({ isLoading: true });
        try {
          const [list, count] = await Promise.all([
            listNotifications({ limit: NOTIFICATIONS_PAGE_LIMIT }),
            getUnreadNotificationCount(),
          ]);
          set({ items: list.data, unreadCount: count, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
      clearStore: () => {
        realtimeDisconnect?.();
        realtimeDisconnect = null;
        set({ items: [], unreadCount: 0, isLoading: false, isHydrating: false });
      },
      connectRealtime: () => {
        realtimeDisconnect?.();
        realtimeDisconnect = connectNotificationStream({
          onNotification: (notification) => {
            get().pushNotification(notification);
          },
        });
      },
      disconnectRealtime: () => {
        realtimeDisconnect?.();
        realtimeDisconnect = null;
      },
      pushNotification: (notification) => {
        set((state) => {
          if (state.items.some((item) => item.id === notification.id)) {
            return state;
          }
          const items = [notification, ...state.items].slice(0, NOTIFICATIONS_PAGE_LIMIT);
          return {
            items,
            unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
          };
        });
      },
      markRead: async (id) => {
        const prev = get().items.find((item) => item.id === id);
        const updated = await markNotificationRead(id);
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? updated : item)),
          unreadCount:
            prev && !prev.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        }));
      },
      markUnread: async (id) => {
        const prev = get().items.find((item) => item.id === id);
        const updated = await markNotificationUnread(id);
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? updated : item)),
          unreadCount: prev?.isRead && !updated.isRead ? state.unreadCount + 1 : state.unreadCount,
        }));
      },
      markAllRead: async () => {
        await markAllNotificationsRead();
        set((state) => ({
          items: state.items.map((item) => ({
            ...item,
            isRead: true,
            readAt: item.readAt ?? new Date().toISOString(),
          })),
          unreadCount: 0,
        }));
      },
      remove: async (id) => {
        const removed = get().items.find((item) => item.id === id);
        await deleteNotification(id);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          unreadCount:
            removed && !removed.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        }));
      },
      clearAll: async () => {
        await clearAllNotifications();
        set({ items: [], unreadCount: 0 });
      },
    }),
    { name: 'notifications-store' },
  ),
);
