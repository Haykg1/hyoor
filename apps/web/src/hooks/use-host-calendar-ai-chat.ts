'use client';

import type { HostCalendarChangeEntry, HostCalendarChatResponse } from '@repo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api';
import { confirmHostCalendarChanges, postHostCalendarChat } from '@/lib/api/host-calendar-ai';

const MAX_STORED_MESSAGES = 20;
const MAX_API_MESSAGES = 20;
const MAX_USER_MESSAGE_CHARS = 500;

export interface HostCalendarUiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  responseType?: HostCalendarChatResponse['type'];
  proposedChanges?: HostCalendarChatResponse['proposedChanges'];
  appliedSummary?: HostCalendarChatResponse['appliedSummary'];
  revertHint?: string;
  confirmStatus?: 'pending' | 'confirmed' | 'cancelled';
}

interface UseHostCalendarAiChatResult {
  messages: HostCalendarUiMessage[];
  isLoading: boolean;
  isConfirming: boolean;
  sendMessage: (content: string) => Promise<void>;
  confirmProposal: (messageId: string, entries: HostCalendarChangeEntry[]) => Promise<void>;
  cancelProposal: (messageId: string) => void;
  clearMessages: () => void;
}

function storageKey(propertyId: string): string {
  return `host-calendar-ai-${propertyId}`;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadStored(propertyId: string): HostCalendarUiMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(storageKey(propertyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HostCalendarUiMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(propertyId: string, messages: HostCalendarUiMessage[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(
    storageKey(propertyId),
    JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
  );
}

function mapResponseToMessage(
  response: HostCalendarChatResponse,
): Omit<HostCalendarUiMessage, 'id' | 'role'> {
  return {
    content: response.message,
    responseType: response.type,
    proposedChanges: response.proposedChanges,
    appliedSummary: response.appliedSummary,
    revertHint: response.revertHint,
    confirmStatus: response.type === 'calendar_preview' ? 'pending' : undefined,
  };
}

export function useHostCalendarAiChat(
  propertyId: string,
  onQuotaChange?: () => Promise<void>,
  onApplied?: () => Promise<void>,
): UseHostCalendarAiChatResult {
  const locale = useLocale();
  const t = useTranslations('dashboard.calendar.ai');
  const [messages, setMessages] = useState<HostCalendarUiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setMessages(loadStored(propertyId));
    setHydrated(true);
  }, [propertyId]);
  useEffect(() => {
    if (!hydrated) return;
    persist(propertyId, messages);
  }, [messages, hydrated, propertyId]);
  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(storageKey(propertyId));
  }, [propertyId]);
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;
      if (trimmed.length > MAX_USER_MESSAGE_CHARS) {
        toast.error(t('message_too_long', { max: MAX_USER_MESSAGE_CHARS }));
        return;
      }
      const userMessage: HostCalendarUiMessage = {
        id: createId(),
        role: 'user',
        content: trimmed,
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setIsLoading(true);
      try {
        const response = await postHostCalendarChat(propertyId, {
          messages: nextMessages
            .slice(-MAX_API_MESSAGES)
            .map((m) => ({ role: m.role, content: m.content })),
          locale,
        });
        const assistantMessage: HostCalendarUiMessage = {
          id: createId(),
          role: 'assistant',
          ...mapResponseToMessage(response),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (onQuotaChange) await onQuotaChange();
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          toast.error(t('limit_reached'));
          if (onQuotaChange) await onQuotaChange();
        } else {
          toast.error(t('error_generic'));
        }
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, locale, messages, onQuotaChange, propertyId, t],
  );
  const confirmProposal = useCallback(
    async (messageId: string, entries: HostCalendarChangeEntry[]) => {
      if (isConfirming) return;
      setIsConfirming(true);
      try {
        const response = await confirmHostCalendarChanges(propertyId, { entries, locale });
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            return {
              ...m,
              confirmStatus: 'confirmed' as const,
              responseType: response.type,
              content: response.message,
              appliedSummary: response.appliedSummary,
              revertHint: response.revertHint,
              proposedChanges: undefined,
            };
          }),
        );
        toast.success(t('applied_success'));
        if (onApplied) await onApplied();
        if (onQuotaChange) await onQuotaChange();
      } catch {
        toast.error(t('confirm_failed'));
      } finally {
        setIsConfirming(false);
      }
    },
    [isConfirming, locale, onApplied, onQuotaChange, propertyId, t],
  );
  const cancelProposal = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, confirmStatus: 'cancelled' as const, proposedChanges: undefined }
          : m,
      ),
    );
  }, []);
  return {
    messages,
    isLoading,
    isConfirming,
    sendMessage,
    confirmProposal,
    cancelProposal,
    clearMessages,
  };
}
