import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  notifications: { count: number };
  setNotificationCount: (count: number) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      notifications: { count: 0 },
      setNotificationCount: (count) => set({ notifications: { count } }),
    }),
    { name: 'ui-store' },
  ),
);
