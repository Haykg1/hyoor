'use client';

import {
  suggestionsMatchDisplayCurrency,
  todayIsoLocal,
  type SearchDisplayCurrency,
} from '@repo/shared';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { useDisplayMoney } from '@/hooks/use-display-money';
import { getHostCalendarAiSuggestions } from '@/lib/api/host-calendar-ai';
import { useDisplayCurrencyStore } from '@/store/display-currency.store';

interface StoredSuggestions {
  date: string;
  suggestions: string[];
}

interface UseHostCalendarAiSuggestionsResult {
  suggestions: string[];
  isLoading: boolean;
}

const CACHE_VERSION = 'v2';

function storageKey(
  propertyId: string,
  locale: string,
  displayCurrency: SearchDisplayCurrency,
): string {
  return `host-calendar-ai-suggestions-${CACHE_VERSION}-${propertyId}-${locale}-${displayCurrency}`;
}

function loadStored(
  propertyId: string,
  locale: string,
  displayCurrency: SearchDisplayCurrency,
): StoredSuggestions | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(propertyId, locale, displayCurrency));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSuggestions;
    if (!parsed || typeof parsed.date !== 'string' || !Array.isArray(parsed.suggestions)) {
      return null;
    }
    if (!suggestionsMatchDisplayCurrency(parsed.suggestions, displayCurrency)) {
      localStorage.removeItem(storageKey(propertyId, locale, displayCurrency));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persist(
  propertyId: string,
  locale: string,
  displayCurrency: SearchDisplayCurrency,
  value: StoredSuggestions,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(propertyId, locale, displayCurrency), JSON.stringify(value));
}

export function useHostCalendarAiSuggestions(
  propertyId: string,
): UseHostCalendarAiSuggestionsResult {
  const locale = useLocale();
  const { displayCurrency } = useDisplayMoney();
  const [hydrated, setHydrated] = useState(() => useDisplayCurrencyStore.persist.hasHydrated());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useDisplayCurrencyStore.persist.hasHydrated()) {
      finish();
      return;
    }
    return useDisplayCurrencyStore.persist.onFinishHydration(finish);
  }, []);
  const loadSuggestions = useCallback(async () => {
    if (!hydrated) return;
    const today = todayIsoLocal();
    const cached = loadStored(propertyId, locale, displayCurrency);
    if (cached?.date === today && cached.suggestions.length > 0) {
      setSuggestions(cached.suggestions);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await getHostCalendarAiSuggestions(propertyId, locale, displayCurrency);
      const next = response.suggestions
        .filter(Boolean)
        .filter((s) => suggestionsMatchDisplayCurrency([s], displayCurrency));
      if (next.length > 0) {
        persist(propertyId, locale, displayCurrency, { date: today, suggestions: next });
        setSuggestions(next);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [displayCurrency, hydrated, locale, propertyId]);
  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);
  return { suggestions, isLoading: !hydrated || isLoading };
}
