'use client';

import type { AiSearchQuota } from '@repo/shared';
import { useCallback, useEffect, useState } from 'react';

import { getHostCalendarAiQuota } from '@/lib/api/host-calendar-ai';

interface UseHostCalendarAiQuotaResult {
  quota: AiSearchQuota | null;
  isLoading: boolean;
  refreshQuota: () => Promise<void>;
}

export function useHostCalendarAiQuota(): UseHostCalendarAiQuotaResult {
  const [quota, setQuota] = useState<AiSearchQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshQuota = useCallback(async () => {
    try {
      const data = await getHostCalendarAiQuota();
      setQuota(data);
    } catch {
      setQuota(null);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);
  return { quota, isLoading, refreshQuota };
}
