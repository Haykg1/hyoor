'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { getHostCalendarAiSuggestions } from '@/lib/api/host-calendar-ai';

interface StoredSuggestions {
  date: string;
  suggestions: string[];
}

interface UseHostCalendarAiSuggestionsResult {
  suggestions: string[];
  isLoading: boolean;
}

function storageKey(propertyId: string, locale: string): string {
  return `host-calendar-ai-suggestions-${propertyId}-${locale}`;
}

function todayLocalIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function loadStored(propertyId: string, locale: string): StoredSuggestions | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(propertyId, locale));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSuggestions;
    if (!parsed || typeof parsed.date !== 'string' || !Array.isArray(parsed.suggestions)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persist(propertyId: string, locale: string, value: StoredSuggestions): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(propertyId, locale), JSON.stringify(value));
}

export function useHostCalendarAiSuggestions(
  propertyId: string,
): UseHostCalendarAiSuggestionsResult {
  const locale = useLocale();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadSuggestions = useCallback(async () => {
    const today = todayLocalIso();
    const cached = loadStored(propertyId, locale);
    if (cached?.date === today && cached.suggestions.length > 0) {
      setSuggestions(cached.suggestions);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await getHostCalendarAiSuggestions(propertyId, locale);
      const next = response.suggestions.filter(Boolean);
      if (next.length > 0) {
        persist(propertyId, locale, { date: today, suggestions: next });
        setSuggestions(next);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [locale, propertyId]);
  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);
  return { suggestions, isLoading };
}
