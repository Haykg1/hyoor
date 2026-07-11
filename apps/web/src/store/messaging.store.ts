import type { ConversationPreview, MessageView } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  getConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage as sendMessageApi,
} from '@/lib/api/messaging';
import {
  connectMessagingSocket,
  disconnectMessagingSocket,
  emitSendMessage,
  getMessagingSocket,
  joinConversationRoom,
  leaveConversationRoom,
} from '@/lib/messaging/socket';

const PAGE_LIMIT = 20;

interface MessagingState {
  conversations: ConversationPreview[];
  conversationsCursor: string | null;
  conversationsHasMore: boolean;
  conversationsLoading: boolean;
  activeConversationId: string | null;
  messages: MessageView[];
  messagesCursor: string | null;
  messagesHasMore: boolean;
  messagesLoading: boolean;
  sending: boolean;
  totalUnread: number;
  isThreadAtBottom: boolean;
  isThreadVisible: boolean;
  hydrateConversations: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  selectConversation: (id: string | null) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  setThreadAtBottom: (atBottom: boolean) => void;
  setThreadVisible: (visible: boolean) => void;
  markActiveConversationRead: (force?: boolean) => Promise<void>;
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  clearStore: () => void;
}

function sortConversations(items: ConversationPreview[]): ConversationPreview[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function upsertConversation(
  items: ConversationPreview[],
  preview: ConversationPreview,
): ConversationPreview[] {
  const without = items.filter((item) => item.id !== preview.id);
  return sortConversations([preview, ...without]);
}

function computeUnread(items: ConversationPreview[]): number {
  return items.reduce((sum, item) => sum + item.unreadCount, 0);
}

export const useMessagingStore = create<MessagingState>()(
  devtools(
    (set, get) => ({
      conversations: [],
      conversationsCursor: null,
      conversationsHasMore: false,
      conversationsLoading: false,
      activeConversationId: null,
      messages: [],
      messagesCursor: null,
      messagesHasMore: false,
      messagesLoading: false,
      sending: false,
      totalUnread: 0,
      isThreadAtBottom: true,
      isThreadVisible: false,
      hydrateConversations: async () => {
        set({ conversationsLoading: true });
        try {
          const page = await listConversations({ limit: PAGE_LIMIT });
          set({
            conversations: page.data,
            conversationsCursor: page.nextCursor,
            conversationsHasMore: page.hasMore,
            totalUnread: computeUnread(page.data),
          });
        } finally {
          set({ conversationsLoading: false });
        }
      },
      loadMoreConversations: async () => {
        const { conversationsHasMore, conversationsCursor, conversationsLoading, conversations } =
          get();
        if (!conversationsHasMore || !conversationsCursor || conversationsLoading) return;
        set({ conversationsLoading: true });
        try {
          const page = await listConversations({
            cursor: conversationsCursor,
            limit: PAGE_LIMIT,
          });
          const merged = sortConversations([...conversations, ...page.data]);
          set({
            conversations: merged,
            conversationsCursor: page.nextCursor,
            conversationsHasMore: page.hasMore,
            totalUnread: computeUnread(merged),
          });
        } finally {
          set({ conversationsLoading: false });
        }
      },
      selectConversation: async (id) => {
        const prevId = get().activeConversationId;
        if (prevId && prevId !== id) {
          leaveConversationRoom(prevId);
        }
        if (!id) {
          set({
            activeConversationId: null,
            messages: [],
            messagesCursor: null,
            messagesHasMore: false,
            isThreadAtBottom: true,
          });
          return;
        }
        set({
          activeConversationId: id,
          messagesLoading: true,
          messages: [],
          messagesCursor: null,
          messagesHasMore: false,
          isThreadAtBottom: true,
        });
        try {
          await getConversation(id);
          const page = await listMessages(id, { limit: PAGE_LIMIT });
          const chronological = [...page.data].reverse();
          set({
            messages: chronological,
            messagesCursor: page.nextCursor,
            messagesHasMore: page.hasMore,
          });
          joinConversationRoom(id);
          await markConversationRead(id);
          const conversations = get().conversations.map((item) =>
            item.id === id ? { ...item, unreadCount: 0 } : item,
          );
          set({ conversations, totalUnread: computeUnread(conversations) });
        } finally {
          set({ messagesLoading: false });
        }
      },
      loadMoreMessages: async () => {
        const { activeConversationId, messagesHasMore, messagesCursor, messagesLoading, messages } =
          get();
        if (!activeConversationId || !messagesHasMore || !messagesCursor || messagesLoading) {
          return;
        }
        set({ messagesLoading: true });
        try {
          const page = await listMessages(activeConversationId, {
            cursor: messagesCursor,
            limit: PAGE_LIMIT,
          });
          const olderChronological = [...page.data].reverse();
          set({
            messages: [...olderChronological, ...messages],
            messagesCursor: page.nextCursor,
            messagesHasMore: page.hasMore,
          });
        } finally {
          set({ messagesLoading: false });
        }
      },
      sendMessage: async (body) => {
        const { activeConversationId } = get();
        if (!activeConversationId || !body.trim()) return;
        set({ sending: true });
        try {
          const socket = getMessagingSocket();
          let message: MessageView | null = null;
          if (socket?.connected) {
            const ack = await emitSendMessage(activeConversationId, body.trim());
            if (ack.ok && ack.message && typeof ack.message === 'object') {
              message = ack.message as MessageView;
            } else {
              message = await sendMessageApi(activeConversationId, body.trim());
            }
          } else {
            message = await sendMessageApi(activeConversationId, body.trim());
          }
          if (!message) return;
          const exists = get().messages.some((item) => item.id === message!.id);
          if (!exists) {
            set({ messages: [...get().messages, message] });
          }
          const existing = get().conversations.find((c) => c.id === activeConversationId);
          if (existing) {
            set({
              conversations: upsertConversation(get().conversations, {
                ...existing,
                lastMessage: message,
                updatedAt: message.createdAt,
              }),
            });
          }
        } finally {
          set({ sending: false });
        }
      },
      setThreadAtBottom: (atBottom) => {
        set({ isThreadAtBottom: atBottom });
      },
      setThreadVisible: (visible) => {
        set({ isThreadVisible: visible });
        const activeId = get().activeConversationId;
        if (!visible) {
          if (activeId) leaveConversationRoom(activeId);
          set({ isThreadAtBottom: false });
          return;
        }
        if (activeId) {
          joinConversationRoom(activeId);
          set({ isThreadAtBottom: true });
        }
      },
      markActiveConversationRead: async (force = false) => {
        const { activeConversationId, conversations, isThreadVisible } = get();
        if (!activeConversationId || !isThreadVisible) return;
        const active = conversations.find((item) => item.id === activeConversationId);
        if (!force && active && active.unreadCount === 0) return;
        await markConversationRead(activeConversationId);
        const next = get().conversations.map((item) =>
          item.id === activeConversationId ? { ...item, unreadCount: 0 } : item,
        );
        set({ conversations: next, totalUnread: computeUnread(next) });
      },
      connectRealtime: () => {
        try {
          const socket = connectMessagingSocket();
          socket.off('message:new');
          socket.off('conversation:updated');
          socket.on('message:new', (message: MessageView) => {
            const { activeConversationId, messages, isThreadAtBottom, isThreadVisible } = get();
            if (!isThreadVisible || activeConversationId !== message.conversationId) return;
            if (messages.some((item) => item.id === message.id)) return;
            set({ messages: [...messages, message] });
            if (isThreadAtBottom) {
              void get().markActiveConversationRead(true);
            }
          });
          socket.on('conversation:updated', (preview: ConversationPreview) => {
            const conversations = upsertConversation(get().conversations, preview);
            const activeId = get().activeConversationId;
            const viewingLive =
              get().isThreadVisible && get().isThreadAtBottom && activeId === preview.id;
            const normalized = viewingLive
              ? conversations.map((item) =>
                  item.id === activeId ? { ...item, unreadCount: 0 } : item,
                )
              : conversations;
            set({
              conversations: normalized,
              totalUnread: computeUnread(normalized),
            });
          });
        } catch {
          // Socket connect may fail before auth cookie is ready; hydrator retries on user change.
        }
      },
      disconnectRealtime: () => {
        const activeId = get().activeConversationId;
        if (activeId) leaveConversationRoom(activeId);
        disconnectMessagingSocket();
      },
      clearStore: () => {
        get().disconnectRealtime();
        set({
          conversations: [],
          conversationsCursor: null,
          conversationsHasMore: false,
          conversationsLoading: false,
          activeConversationId: null,
          messages: [],
          messagesCursor: null,
          messagesHasMore: false,
          messagesLoading: false,
          sending: false,
          totalUnread: 0,
          isThreadAtBottom: true,
          isThreadVisible: false,
        });
      },
    }),
    { name: 'messaging-store' },
  ),
);
