import type { AiSearchChatRequest, AiSearchChatResponse, AiSearchQuota } from '@repo/shared';

import { api } from '@/lib/api';

export async function getAiSearchQuota(): Promise<AiSearchQuota> {
  return api.get<AiSearchQuota>('/ai-search/quota');
}

export async function postAiSearchChat(
  request: AiSearchChatRequest,
): Promise<AiSearchChatResponse> {
  return api.post<AiSearchChatResponse>('/ai-search/chat', request);
}
