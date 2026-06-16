'use client';

import type { AiSearchQuota } from '@repo/shared';
import { useCallback, useEffect, useState } from 'react';

import { getAiSearchQuota } from '@/lib/api/ai-search';
import { useAuthStore } from '@/store';

interface UseAiSearchQuotaResult {
  quota: AiSearchQuota | null;
  isLoading: boolean;
  refreshQuota: () => Promise<void>;
}

export function useAiSearchQuota(): UseAiSearchQuotaResult {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [quota, setQuota] = useState<AiSearchQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshQuota = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await getAiSearchQuota();
      setQuota(next);
    } catch {
      setQuota(null);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void refreshQuota();
  }, [isAuthenticated, refreshQuota]);
  return { quota, isLoading, refreshQuota };
}
