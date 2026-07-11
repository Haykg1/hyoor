'use client';

import { ArrowDown, Loader2, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { PropertyCard } from '@/components/property';
import { Button } from '@/components/ui/button';
import { getCountryDisplayName } from '@/lib/format/country';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useMessagingStore } from '@/store/messaging.store';

import { PaymentSafetyNotice } from './payment-safety-notice';

const BOTTOM_THRESHOLD_PX = 80;
const SCROLL_TO_BOTTOM_MIN_MESSAGES = 10;

function isNearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX;
}

function countMessagesBelowViewport(root: HTMLElement): number {
  const rootBottom = root.getBoundingClientRect().bottom;
  const nodes = root.querySelectorAll<HTMLElement>('[data-message-row]');
  let count = 0;
  for (const node of nodes) {
    if (node.getBoundingClientRect().top > rootBottom) count += 1;
  }
  return count;
}

export function ChatThread(): React.JSX.Element {
  const t = useTranslations('messaging');
  const locale = useLocale();
  const userId = useAuthStore((s) => s.user?.id);
  const activeId = useMessagingStore((s) => s.activeConversationId);
  const conversations = useMessagingStore((s) => s.conversations);
  const messages = useMessagingStore((s) => s.messages);
  const loading = useMessagingStore((s) => s.messagesLoading);
  const hasMore = useMessagingStore((s) => s.messagesHasMore);
  const sending = useMessagingStore((s) => s.sending);
  const isThreadAtBottom = useMessagingStore((s) => s.isThreadAtBottom);
  const isThreadVisible = useMessagingStore((s) => s.isThreadVisible);
  const loadMoreMessages = useMessagingStore((s) => s.loadMoreMessages);
  const sendMessage = useMessagingStore((s) => s.sendMessage);
  const setThreadAtBottom = useMessagingStore((s) => s.setThreadAtBottom);
  const setThreadVisible = useMessagingStore((s) => s.setThreadVisible);
  const markActiveConversationRead = useMessagingStore((s) => s.markActiveConversationRead);
  const [draft, setDraft] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newBelowCount, setNewBelowCount] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const smoothScrollingRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const active = conversations.find((item) => item.id === activeId);
  useEffect(() => {
    setThreadVisible(true);
    return () => {
      setThreadVisible(false);
    };
  }, [setThreadVisible]);
  useEffect(() => {
    initialScrollDoneRef.current = false;
    shouldStickToBottomRef.current = true;
    smoothScrollingRef.current = false;
    prevMessageCountRef.current = 0;
    prevLastMessageIdRef.current = null;
    setNewBelowCount(0);
    setShowScrollToBottom(false);
    setThreadAtBottom(true);
  }, [activeId, setThreadAtBottom]);
  useEffect(() => {
    if (!activeId || !isThreadVisible) return;
    if (loading && messages.length === 0) return;
    const root = scrollContainerRef.current;
    if (!root) return;
    const lastMessage = messages[messages.length - 1] ?? null;
    const lastId = lastMessage?.id ?? null;
    const countIncreased = messages.length > prevMessageCountRef.current;
    const appendedAtEnd =
      countIncreased &&
      prevMessageCountRef.current > 0 &&
      lastId !== null &&
      lastId !== prevLastMessageIdRef.current;
    const prepended = countIncreased && prevMessageCountRef.current > 0 && !appendedAtEnd;
    prevMessageCountRef.current = messages.length;
    prevLastMessageIdRef.current = lastId;
    if (smoothScrollingRef.current) return;
    if (!initialScrollDoneRef.current || shouldStickToBottomRef.current) {
      requestAnimationFrame(() => {
        root.scrollTop = root.scrollHeight;
        initialScrollDoneRef.current = true;
        shouldStickToBottomRef.current = true;
        setThreadAtBottom(true);
        setNewBelowCount(0);
        setShowScrollToBottom(false);
      });
      return;
    }
    if (prepended) return;
    if (appendedAtEnd && lastMessage && lastMessage.senderId !== userId) {
      setNewBelowCount((count) => count + 1);
      setShowScrollToBottom(false);
      return;
    }
    if (isThreadAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setNewBelowCount(0);
      setShowScrollToBottom(false);
    }
  }, [activeId, isThreadVisible, loading, messages, isThreadAtBottom, setThreadAtBottom, userId]);
  useEffect(() => {
    if (!activeId) return;
    const root = scrollContainerRef.current;
    if (!root) return;
    const syncScrollChrome = (): void => {
      const atBottom = isNearBottom(root);
      shouldStickToBottomRef.current = atBottom;
      setThreadAtBottom(atBottom);
      if (atBottom) {
        smoothScrollingRef.current = false;
        setNewBelowCount(0);
        setShowScrollToBottom(false);
        void markActiveConversationRead();
        return;
      }
      if (smoothScrollingRef.current) return;
      const below = countMessagesBelowViewport(root);
      setShowScrollToBottom(below > SCROLL_TO_BOTTOM_MIN_MESSAGES);
    };
    root.addEventListener('scroll', syncScrollChrome, { passive: true });
    requestAnimationFrame(syncScrollChrome);
    return () => root.removeEventListener('scroll', syncScrollChrome);
  }, [activeId, messages.length, setThreadAtBottom, markActiveConversationRead]);
  useEffect(() => {
    const node = topSentinelRef.current;
    const root = scrollContainerRef.current;
    if (!node || !root || !activeId) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!hasMore || loadingOlder || loading) return;
        if (!initialScrollDoneRef.current) return;
        const prevHeight = root.scrollHeight;
        const prevTop = root.scrollTop;
        setLoadingOlder(true);
        void loadMoreMessages()
          .then(() => {
            requestAnimationFrame(() => {
              root.scrollTop = root.scrollHeight - prevHeight + prevTop;
            });
          })
          .finally(() => {
            setLoadingOlder(false);
          });
      },
      { root, rootMargin: '80px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMoreMessages, hasMore, activeId, loadingOlder, loading]);
  function scrollToLatest(): void {
    const root = scrollContainerRef.current;
    if (!root) return;
    smoothScrollingRef.current = true;
    setNewBelowCount(0);
    setShowScrollToBottom(false);
    root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' });
    void markActiveConversationRead(true);
  }
  if (!activeId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {t('select_conversation')}
      </div>
    );
  }
  const title = [active?.otherParticipant.firstName, active?.otherParticipant.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    shouldStickToBottomRef.current = true;
    setThreadAtBottom(true);
    setNewBelowCount(0);
    setShowScrollToBottom(false);
    await sendMessage(body);
  }
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="font-medium">{title || t('conversation')}</p>
        {active?.otherParticipant.nationality ? (
          <p className="text-xs text-muted-foreground">
            {t('from', {
              place: getCountryDisplayName(active.otherParticipant.nationality, locale),
            })}
          </p>
        ) : null}
      </div>
      <PaymentSafetyNotice />
      <div className="relative min-h-0 flex-1">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto px-4 py-3">
          <div ref={topSentinelRef} className="flex h-6 w-full items-center justify-center">
            {loadingOlder ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {loading && messages.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          <div className="space-y-3">
            {messages.map((message) => {
              const mine = message.senderId === userId;
              if (message.kind === 'PROPERTY_CARD' && message.property) {
                return (
                  <div
                    key={message.id}
                    data-message-row
                    className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                  >
                    <div className="w-full max-w-[280px] sm:max-w-[320px]">
                      <PropertyCard property={message.property} />
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={message.id}
                  data-message-row
                  className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                      mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </div>
        {newBelowCount > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto gap-1.5 rounded-full shadow-md"
              onClick={scrollToLatest}
            >
              <ArrowDown className="h-4 w-4" />
              {t('new_messages', { count: newBelowCount })}
            </Button>
          </div>
        ) : showScrollToBottom ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
            <button
              type="button"
              onClick={scrollToLatest}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-black/40 bg-transparent px-3 py-1.5 text-xs font-medium text-black dark:border-white/40 dark:text-white"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {t('scroll_to_bottom')}
            </button>
          </div>
        ) : null}
      </div>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('composer_placeholder')}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={2000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !draft.trim()}
          aria-label={t('send')}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
