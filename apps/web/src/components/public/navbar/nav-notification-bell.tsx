'use client';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAuthStore } from '@/store/auth.store';

interface NavNotificationBellProps {
  className?: string;
}

export function NavNotificationBell({
  className,
}: NavNotificationBellProps): React.JSX.Element | null {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <div className={`relative ${className ?? ''}`}>
      <NotificationBell />
    </div>
  );
}
