import type {
  ConversationDetail,
  ConversationPreview,
  CursorPage,
  MessageView,
} from '@repo/shared';

import { api } from '@/lib/api';

export async function findOrCreateConversation(propertyId: string): Promise<ConversationPreview> {
  return api.post<ConversationPreview>('/messaging/conversations', { propertyId });
}

export async function listConversations(
  params: {
    cursor?: string;
    limit?: number;
  } = {},
): Promise<CursorPage<ConversationPreview>> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return api.get<CursorPage<ConversationPreview>>(
    `/messaging/conversations${query ? `?${query}` : ''}`,
  );
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/messaging/conversations/${id}`);
}

export async function listMessages(
  conversationId: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<CursorPage<MessageView>> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return api.get<CursorPage<MessageView>>(
    `/messaging/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
  );
}

export async function sendMessage(conversationId: string, body: string): Promise<MessageView> {
  return api.post<MessageView>(`/messaging/conversations/${conversationId}/messages`, { body });
}

export async function markConversationRead(
  conversationId: string,
): Promise<{ updatedCount: number }> {
  return api.patch<{ updatedCount: number }>(`/messaging/conversations/${conversationId}/read`, {});
}
