'use client';

import type { AiSearchExtractedFilters, PropertySummary } from '@repo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api';
import { postAiSearchChat } from '@/lib/api/ai-search';

const STORAGE_KEY = 'ai-search-messages';
const MAX_STORED_MESSAGES = 30;
const GUEST_LIMIT_CODE = 'AI_SEARCH_GUEST_LIMIT';
const TOKEN_LIMIT_CODE = 'AI_SEARCH_TOKEN_LIMIT';
const MAX_USER_MESSAGE_CHARS = 500;

export interface AiSearchUiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  filters?: AiSearchExtractedFilters;
  properties?: PropertySummary[];
  searchPath?: string;
}

interface UseAiSearchChatResult {
  messages: AiSearchUiMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadStoredMessages(): AiSearchUiMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiSearchUiMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistMessages(messages: AiSearchUiMessage[]): void {
  if (typeof window === 'undefined') return;
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function hasErrorCode(body: string | undefined, code: string): boolean {
  if (!body) return false;
  return body.includes(code);
}

export function useAiSearchChat(onQuotaChange?: () => Promise<void>): UseAiSearchChatResult {
  const locale = useLocale();
  const t = useTranslations('ai_search');
  const [messages, setMessages] = useState<AiSearchUiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setMessages(loadStoredMessages());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    persistMessages(messages);
  }, [messages, hydrated]);
  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;
      if (trimmed.length > MAX_USER_MESSAGE_CHARS) {
        toast.error(t('message_too_long', { max: MAX_USER_MESSAGE_CHARS }));
        return;
      }
      const userMessage: AiSearchUiMessage = {
        id: createId(),
        role: 'user',
        content: trimmed,
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setIsLoading(true);
      try {
        const response = await postAiSearchChat({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          locale,
        });
        const assistantMessage: AiSearchUiMessage = {
          id: createId(),
          role: 'assistant',
          content: response.message,
          filters: response.filters,
          properties: response.properties,
          searchPath: response.searchPath,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (onQuotaChange) {
          await onQuotaChange();
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          if (hasErrorCode(error.body, GUEST_LIMIT_CODE)) {
            toast.error(t('guest_limit_reached'));
            if (onQuotaChange) {
              await onQuotaChange();
            }
          } else if (hasErrorCode(error.body, TOKEN_LIMIT_CODE)) {
            toast.error(t('token_limit_reached'));
            if (onQuotaChange) {
              await onQuotaChange();
            }
          } else {
            toast.error(t('rate_limit_reached'));
          }
        } else {
          toast.error(t('error_generic'));
        }
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, locale, messages, onQuotaChange, t],
  );
  return { messages, isLoading, sendMessage, clearMessages };
}
