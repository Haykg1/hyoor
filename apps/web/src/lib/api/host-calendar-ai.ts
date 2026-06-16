import type {
  HostCalendarChatRequest,
  HostCalendarChatResponse,
  HostCalendarConfirmRequest,
  AiSearchQuota,
} from '@repo/shared';

import { api } from '@/lib/api';

export async function getHostCalendarAiQuota(): Promise<AiSearchQuota> {
  return api.get<AiSearchQuota>('/ai-search/host-calendar/quota');
}

export async function postHostCalendarChat(
  propertyId: string,
  request: HostCalendarChatRequest,
): Promise<HostCalendarChatResponse> {
  return api.post<HostCalendarChatResponse>(`/ai-search/host-calendar/${propertyId}/chat`, request);
}

export async function confirmHostCalendarChanges(
  propertyId: string,
  request: HostCalendarConfirmRequest,
): Promise<HostCalendarChatResponse> {
  return api.post<HostCalendarChatResponse>(
    `/ai-search/host-calendar/${propertyId}/confirm`,
    request,
  );
}
