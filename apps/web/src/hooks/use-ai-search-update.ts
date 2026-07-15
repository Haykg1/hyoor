'use client';

import type { AiSearchChatResponse } from '@repo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { postAiSearchChat } from '@/lib/api/ai-search';

const GUEST_LIMIT_CODE = 'AI_SEARCH_GUEST_LIMIT';
const TOKEN_LIMIT_CODE = 'AI_SEARCH_TOKEN_LIMIT';
const MAX_USER_MESSAGE_CHARS = 500;

function hasErrorCode(body: string | undefined, code: string): boolean {
  if (!body) return false;
  return body.includes(code);
}

function ensureAiFlag(path: string): string {
  if (path.includes('ai=1')) return path;
  return path.includes('?') ? `${path}&ai=1` : `${path}?ai=1`;
}

interface UseAiSearchUpdateResult {
  isLoading: boolean;
  runUpdate: (prompt: string) => Promise<AiSearchChatResponse | null>;
}

export function useAiSearchUpdate(): UseAiSearchUpdateResult {
  const locale = useLocale();
  const t = useTranslations('ai_search');
  const tSearch = useTranslations('search');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const runUpdate = useCallback(
    async (prompt: string): Promise<AiSearchChatResponse | null> => {
      const trimmed = prompt.trim();
      if (!trimmed) return null;
      if (trimmed.length > MAX_USER_MESSAGE_CHARS) {
        toast.error(t('message_too_long'));
        return null;
      }
      setIsLoading(true);
      try {
        const response = await postAiSearchChat({
          messages: [{ role: 'user', content: trimmed }],
          locale,
        });
        if (response.type === 'clarify') {
          toast.info(tSearch('ai_search_tip'), {
            duration: 5000,
            className: 'border-brand-200 bg-brand-50 text-brand-900',
          });
        }
        if (response.searchPath) {
          router.push(ensureAiFlag(response.searchPath));
        }
        return response;
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          if (hasErrorCode(error.body, GUEST_LIMIT_CODE)) {
            toast.error(t('guest_limit_reached'));
          } else if (hasErrorCode(error.body, TOKEN_LIMIT_CODE)) {
            toast.error(t('token_limit_reached'));
          } else {
            toast.error(t('rate_limit_reached'));
          }
        } else {
          toast.error(t('error_generic'));
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [locale, router, t, tSearch],
  );
  return { isLoading, runUpdate };
}
