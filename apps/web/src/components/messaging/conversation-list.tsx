'use client';

import type { ConversationPreview } from '@repo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCountryDisplayName } from '@/lib/format/country';
import { cn } from '@/lib/utils';
import { useMessagingStore } from '@/store/messaging.store';

function displayName(preview: ConversationPreview): string {
  const { firstName, lastName } = preview.otherParticipant;
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || 'User';
}

function initials(preview: ConversationPreview): string {
  const name = displayName(preview);
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ConversationList(): React.JSX.Element {
  const t = useTranslations('messaging');
  const locale = useLocale();
  const conversations = useMessagingStore((s) => s.conversations);
  const activeId = useMessagingStore((s) => s.activeConversationId);
  const hasMore = useMessagingStore((s) => s.conversationsHasMore);
  const loading = useMessagingStore((s) => s.conversationsLoading);
  const selectConversation = useMessagingStore((s) => s.selectConversation);
  const loadMore = useMessagingStore((s) => s.loadMoreConversations);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '80px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);
  if (!loading && conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {t('empty_conversations')}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          onClick={() => void selectConversation(conversation.id)}
          className={cn(
            'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60',
            activeId === conversation.id && 'bg-muted',
          )}
        >
          <Avatar className="h-10 w-10 shrink-0">
            {conversation.otherParticipant.avatarUrl ? (
              <AvatarImage
                src={conversation.otherParticipant.avatarUrl}
                alt={displayName(conversation)}
              />
            ) : null}
            <AvatarFallback>{initials(conversation)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{displayName(conversation)}</p>
              {conversation.unreadCount > 0 ? (
                <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {conversation.unreadCount}
                </span>
              ) : null}
            </div>
            {conversation.otherParticipant.nationality ? (
              <p className="truncate text-xs text-muted-foreground">
                {t('from', {
                  place: getCountryDisplayName(conversation.otherParticipant.nationality, locale),
                })}
              </p>
            ) : null}
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {conversation.lastMessage?.body ?? t('no_messages_yet')}
            </p>
          </div>
        </button>
      ))}
      <div ref={sentinelRef} className="h-4 w-full shrink-0" />
      {loading ? (
        <p className="px-4 py-3 text-center text-xs text-muted-foreground">{t('loading')}</p>
      ) : null}
    </div>
  );
}
