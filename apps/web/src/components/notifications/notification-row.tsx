'use client';

import type { NotificationItem } from '@repo/shared';
import { Mail, MailOpen, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface NotificationRowProps {
  item: NotificationItem;
  onToggleRead: (id: string, isRead: boolean) => void;
  onRemove: (id: string) => void;
}

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function NotificationRow({
  item,
  onToggleRead,
  onRemove,
}: NotificationRowProps): React.JSX.Element {
  const t = useTranslations('notifications');
  const showActor = item.type === 'NEW_MESSAGE';
  return (
    <div
      className={`rounded-lg border p-3 ${item.isRead ? 'bg-muted/30' : 'border-primary/30 bg-primary/5'}`}
    >
      <div className="flex items-start gap-2">
        {showActor ? (
          <Avatar className="mt-0.5 h-8 w-8 shrink-0">
            {item.actorAvatarUrl ? (
              <AvatarImage src={item.actorAvatarUrl} alt={item.title} />
            ) : null}
            <AvatarFallback className="text-[10px]">{initialsFromTitle(item.title)}</AvatarFallback>
          </Avatar>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{item.title}</p>
              {item.body ? (
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
                  {item.body}
                </p>
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
      </div>
    </div>
  );
}
