'use client';

import type { ConversationPreview } from '@repo/shared';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { ParticipantAvatar } from '@/components/messaging/participant-avatar';
import { Button } from '@/components/ui/button';
import { getCountryDisplayName } from '@/lib/format/country';
import { cn } from '@/lib/utils';
import { useMessagingStore } from '@/store/messaging.store';

interface ConversationListProps {
  roomsOpen: boolean;
  onToggleRooms: () => void;
}

function displayName(preview: ConversationPreview): string {
  return preview.otherParticipant.displayName || 'User';
}

export function ConversationList({
  roomsOpen,
  onToggleRooms,
}: ConversationListProps): React.JSX.Element {
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
  const empty = !loading && conversations.length === 0;
  return (
    <div className="relative h-full">
      <div
        className={cn(
          'absolute inset-0 flex flex-col transition-[opacity,transform] duration-300 ease-in-out',
          roomsOpen
            ? 'pointer-events-auto translate-x-0 opacity-100'
            : 'pointer-events-none -translate-x-2 opacity-0',
        )}
        aria-hidden={!roomsOpen}
      >
        <RoomsToggleHeader roomsOpen={roomsOpen} onToggleRooms={onToggleRooms} />
        {empty ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {t('empty_conversations')}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.map((conversation) => {
              const name = displayName(conversation);
              return (
                <button
                  key={conversation.id}
                  type="button"
                  tabIndex={roomsOpen ? 0 : -1}
                  onClick={() => void selectConversation(conversation.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60',
                    activeId === conversation.id && 'bg-muted',
                  )}
                >
                  <ParticipantAvatar
                    name={name}
                    avatarUrl={conversation.otherParticipant.avatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{name}</p>
                      {conversation.unreadCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    {conversation.otherParticipant.nationality ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {t('from', {
                          place: getCountryDisplayName(
                            conversation.otherParticipant.nationality,
                            locale,
                          ),
                        })}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conversation.lastMessage?.body ?? t('no_messages_yet')}
                    </p>
                  </div>
                </button>
              );
            })}
            <div ref={sentinelRef} className="h-4 w-full shrink-0" />
            {loading ? (
              <p className="px-4 py-3 text-center text-xs text-muted-foreground">{t('loading')}</p>
            ) : null}
          </div>
        )}
      </div>
      <div
        className={cn(
          'absolute inset-0 flex flex-col transition-[opacity,transform] duration-300 ease-in-out',
          roomsOpen
            ? 'pointer-events-none translate-x-2 opacity-0'
            : 'pointer-events-auto translate-x-0 opacity-100',
        )}
        aria-hidden={roomsOpen}
      >
        <div className="flex items-center justify-center border-b border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            tabIndex={roomsOpen ? -1 : 0}
            aria-label={t('expand_rooms')}
            onClick={onToggleRooms}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
        {!empty ? (
          <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-2">
            {conversations.map((conversation) => {
              const name = displayName(conversation);
              return (
                <button
                  key={conversation.id}
                  type="button"
                  title={name}
                  aria-label={name}
                  tabIndex={roomsOpen ? -1 : 0}
                  onClick={() => void selectConversation(conversation.id)}
                  className={cn(
                    'relative rounded-full p-0.5 transition-colors hover:bg-muted',
                    activeId === conversation.id && 'bg-muted ring-2 ring-primary/40',
                  )}
                >
                  <ParticipantAvatar
                    name={name}
                    avatarUrl={conversation.otherParticipant.avatarUrl}
                    className="h-10 w-10"
                  />
                  {conversation.unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {loading ? (
              <p className="px-1 py-2 text-center text-[10px] text-muted-foreground">
                {t('loading')}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RoomsToggleHeader({
  roomsOpen,
  onToggleRooms,
}: {
  roomsOpen: boolean;
  onToggleRooms: () => void;
}): React.JSX.Element {
  const t = useTranslations('messaging');
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      <p className="truncate text-xs font-medium text-muted-foreground">{t('rooms')}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        tabIndex={roomsOpen ? 0 : -1}
        aria-label={roomsOpen ? t('collapse_rooms') : t('expand_rooms')}
        onClick={onToggleRooms}
      >
        {roomsOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </Button>
    </div>
  );
}
