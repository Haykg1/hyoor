'use client';

import type { NotificationItem } from '@repo/shared';
import { Mail, MailOpen, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface NotificationRowProps {
  item: NotificationItem;
  onToggleRead: (id: string, isRead: boolean) => void;
  onRemove: (id: string) => void;
}

export function NotificationRow({
  item,
  onToggleRead,
  onRemove,
}: NotificationRowProps): React.JSX.Element {
  const t = useTranslations('notifications');
  return (
    <div
      className={`rounded-lg border p-3 ${item.isRead ? 'bg-muted/30' : 'border-primary/30 bg-primary/5'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          {item.body ? (
            <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{item.body}</p>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-foreground">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={item.isRead ? t('mark_unread') : t('mark_read')}
            onClick={() => onToggleRead(item.id, item.isRead)}
          >
            {item.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            aria-label={t('remove')}
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
