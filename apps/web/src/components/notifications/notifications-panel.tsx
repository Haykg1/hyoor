'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationsStore } from '@/store/notifications.store';

import { NotificationRow } from './notification-row';

export function NotificationsPanel(): React.JSX.Element {
  const t = useTranslations('notifications');
  const items = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const isLoading = useNotificationsStore((s) => s.isLoading);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markUnread = useNotificationsStore((s) => s.markUnread);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const remove = useNotificationsStore((s) => s.remove);
  const clearAll = useNotificationsStore((s) => s.clearAll);
  async function handleToggleRead(id: string, isRead: boolean): Promise<void> {
    if (isRead) {
      await markUnread(id);
      return;
    }
    await markRead(id);
  }
  return (
    <div className="flex w-80 flex-col overflow-hidden sm:w-96">
      <div className="flex flex-col gap-2 border-b px-4 py-3">
        <p className="text-sm font-semibold">{t('title')}</p>
        {(unreadCount > 0 || items.length > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto max-w-full whitespace-normal px-2 py-1 text-xs"
                onClick={() => void markAllRead()}
              >
                {t('mark_all_read')}
              </Button>
            )}
            {items.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto max-w-full whitespace-normal px-2 py-1 text-xs text-destructive"
                onClick={() => void clearAll()}
              >
                {t('clear_all')}
              </Button>
            )}
          </div>
        )}
      </div>
      <ScrollArea className="h-80 px-4 py-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onToggleRead={(id, isRead) => void handleToggleRead(id, isRead)}
                onRemove={(id) => void remove(id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
