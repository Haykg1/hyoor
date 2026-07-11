'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { ChatThread } from '@/components/messaging/chat-thread';
import { ConversationList } from '@/components/messaging/conversation-list';
import { useMessagingStore } from '@/store/messaging.store';

export function MessagesInbox(): React.JSX.Element {
  const t = useTranslations('messaging');
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('c');
  const selectConversation = useMessagingStore((s) => s.selectConversation);
  const activeId = useMessagingStore((s) => s.activeConversationId);
  const conversations = useMessagingStore((s) => s.conversations);
  const conversationsLoading = useMessagingStore((s) => s.conversationsLoading);
  const hydrateConversations = useMessagingStore((s) => s.hydrateConversations);
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
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
      <h1 className="mb-4 text-2xl font-semibold">{t('title')}</h1>
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background md:grid-cols-[320px_1fr]">
        <aside className="min-h-0 border-b border-border md:border-b-0 md:border-r">
          <ConversationList />
        </aside>
        <section className="min-h-0">
          <ChatThread />
        </section>
      </div>
    </div>
  );
}
