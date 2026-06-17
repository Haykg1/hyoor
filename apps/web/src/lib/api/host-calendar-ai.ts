import type {
  HostCalendarChatRequest,
  HostCalendarChatResponse,
  HostCalendarConfirmRequest,
  HostCalendarSuggestionsResponse,
  AiSearchQuota,
} from '@repo/shared';

import { api } from '@/lib/api';

export async function getHostCalendarAiQuota(): Promise<AiSearchQuota> {
  return api.get<AiSearchQuota>('/ai-search/host-calendar/quota');
}

export async function getHostCalendarAiSuggestions(
  propertyId: string,
  locale: string,
): Promise<HostCalendarSuggestionsResponse> {
  const params = new URLSearchParams({ locale });
  return api.get<HostCalendarSuggestionsResponse>(
    `/ai-search/host-calendar/${propertyId}/suggestions?${params.toString()}`,
  );
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
