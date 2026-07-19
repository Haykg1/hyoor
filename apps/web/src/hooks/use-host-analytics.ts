'use client';

import type { HostAnalyticsPreset, HostAnalyticsResponse, HostListingSummary } from '@repo/shared';
import { useCallback, useEffect, useState } from 'react';

import { getHostAnalytics } from '@/lib/api/host-analytics';
import { listMyProperties } from '@/lib/api/properties';

interface UseHostAnalyticsResult {
  data: HostAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  preset: HostAnalyticsPreset;
  customFrom: string;
  customTo: string;
  propertyId: string;
  properties: HostListingSummary[];
  setPreset: (preset: HostAnalyticsPreset) => void;
  setCustomFrom: (value: string) => void;
  setCustomTo: (value: string) => void;
  setPropertyId: (value: string) => void;
  refetch: () => Promise<void>;
}

export function useHostAnalytics(): UseHostAnalyticsResult {
  const [data, setData] = useState<HostAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<HostAnalyticsPreset>('last_30_days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<HostListingSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listMyProperties({ limit: 30 })
      .then((res) => {
        if (!cancelled) setProperties(res.data);
      })
      .catch(() => {
        if (!cancelled) setProperties([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (preset === 'custom' && (!customFrom || !customTo)) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const customToExclusive =
        preset === 'custom'
          ? (() => {
              const next = new Date(`${customTo}T00:00:00.000Z`);
              next.setUTCDate(next.getUTCDate() + 1);
              return next.toISOString();
            })()
          : undefined;
      const result = await getHostAnalytics({
        preset,
        from: preset === 'custom' ? `${customFrom}T00:00:00.000Z` : undefined,
        to: customToExclusive,
        propertyId: propertyId || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [preset, customFrom, customTo, propertyId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    isLoading,
    error,
    preset,
    customFrom,
    customTo,
    propertyId,
    properties,
    setPreset,
    setCustomFrom,
    setCustomTo,
    setPropertyId,
    refetch,
  };
}
