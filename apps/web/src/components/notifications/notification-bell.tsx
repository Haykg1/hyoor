'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NotificationsPanel } from '@/components/notifications/notifications-panel';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotificationsStore } from '@/store/notifications.store';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps): React.JSX.Element | null {
  const t = useTranslations('notifications');
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const refresh = useNotificationsStore((s) => s.refresh);
  return (
    <Popover onOpenChange={(open) => open && void refresh()}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className}
          aria-label={t('bell_label')}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <NotificationsPanel />
      </PopoverContent>
    </Popover>
  );
}
