'use client';

import { PanelLeftOpen } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { ChatThread } from '@/components/messaging/chat-thread';
import { ConversationList } from '@/components/messaging/conversation-list';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMessagingStore } from '@/store/messaging.store';

const ROOMS_OPEN_STORAGE_KEY = 'rentstar.messaging.roomsOpen';

export function MessagesInbox(): React.JSX.Element {
  const t = useTranslations('messaging');
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('c');
  const selectConversation = useMessagingStore((s) => s.selectConversation);
  const activeId = useMessagingStore((s) => s.activeConversationId);
  const conversations = useMessagingStore((s) => s.conversations);
  const conversationsLoading = useMessagingStore((s) => s.conversationsLoading);
  const hydrateConversations = useMessagingStore((s) => s.hydrateConversations);
  const [roomsOpen, setRoomsOpen] = useState(true);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ROOMS_OPEN_STORAGE_KEY);
      if (stored === '0') setRoomsOpen(false);
    } catch {
      // ignore storage errors
    }
  }, []);
  useEffect(() => {
    void hydrateConversations();
  }, [hydrateConversations]);
  useEffect(() => {
    if (conversationId) {
      if (conversationId !== activeId) {
        void selectConversation(conversationId);
      }
      return;
    }
    if (conversationsLoading || activeId || conversations.length === 0) return;
    const firstId = conversations[0]?.id;
    if (firstId) {
      void selectConversation(firstId);
    }
  }, [conversationId, activeId, conversations, conversationsLoading, selectConversation]);
  function toggleRooms(): void {
    setRoomsOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(ROOMS_OPEN_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'gap-1.5 transition-[opacity,transform] duration-300 ease-in-out md:hidden',
            roomsOpen
              ? 'pointer-events-none scale-95 opacity-0'
              : 'pointer-events-auto scale-100 opacity-100',
          )}
          tabIndex={roomsOpen ? -1 : 0}
          aria-hidden={roomsOpen}
          onClick={toggleRooms}
        >
          <PanelLeftOpen className="h-4 w-4" />
          {t('expand_rooms')}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background md:flex-row">
        <aside
          className={cn(
            'min-h-0 shrink-0 overflow-hidden border-border md:border-b-0 md:border-r',
            'transition-[width,max-height,opacity,border-width] duration-500 ease-in-out',
            roomsOpen
              ? 'pointer-events-auto max-h-[45%] w-full border-b opacity-100 md:max-h-none md:w-80'
              : 'pointer-events-none max-h-0 w-full border-b-0 opacity-0 md:pointer-events-auto md:max-h-none md:w-[72px] md:border-b-0 md:border-r md:opacity-100',
          )}
        >
          <div className={cn('h-full', roomsOpen ? 'w-full md:w-80' : 'w-full md:w-[72px]')}>
            <ConversationList roomsOpen={roomsOpen} onToggleRooms={toggleRooms} />
          </div>
        </aside>
        <section className="min-h-0 min-w-0 flex-1">
          <ChatThread roomsOpen={roomsOpen} onToggleRooms={toggleRooms} />
        </section>
      </div>
    </div>
  );
}
