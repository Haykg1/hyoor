import { suggestionMatchesDisplayCurrency } from '@repo/shared';

import type { HostCalendarGuardContext } from './host-calendar-input-guard';
import { evaluateHostCalendarMessage } from './host-calendar-input-guard';
import type { HostCalendarSnapshot } from './host-calendar-snapshot';
import {
  formatSuggestionRate,
  type HostCalendarSuggestionPricing,
} from './host-calendar-suggestion-pricing';

const MIN_SUGGESTIONS = 3;

export function buildFallbackHostCalendarSuggestions(
  snapshot: HostCalendarSnapshot,
  maxCount: number,
  pricing: HostCalendarSuggestionPricing,
): string[] {
  const { calendar } = snapshot;
  const peakLabel = formatSuggestionRate(
    pricing.peakDisplay,
    pricing.displayCurrency,
    pricing.peakUsd,
    pricing.settlementCurrency,
  );
  const weekendLabel = formatSuggestionRate(
    pricing.weekendDisplay,
    pricing.displayCurrency,
    pricing.weekendUsd,
    pricing.settlementCurrency,
  );
  const candidates: string[] = [
    `Set ${peakLabel} per night for June 1–August 31`,
    `Set ${weekendLabel} for next weekend`,
    `Close this property for the next 7 days`,
    `Close December 24–January 2`,
    `Revert August dates to base rate`,
  ];
  if (calendar.isSummerSeason) {
    candidates.unshift(
      `Set ${peakLabel} per night for ${calendar.summerFrom}–${calendar.summerTo}`,
    );
  }
  return candidates.slice(0, maxCount);
}

export function filterValidHostCalendarSuggestions(
  suggestions: string[],
  guardContext: HostCalendarGuardContext,
  locale: string | undefined,
  maxCount: number,
  pricing?: HostCalendarSuggestionPricing,
): string[] {
  const valid: string[] = [];
  const seen = new Set<string>();
  for (const raw of suggestions) {
    const content = raw.trim();
    if (!content || seen.has(content.toLowerCase())) continue;
    if (
      pricing &&
      !suggestionMatchesDisplayCurrency(
        content,
        pricing.displayCurrency,
        pricing.settlementCurrency,
      )
    ) {
      continue;
    }
    const guard = evaluateHostCalendarMessage([{ role: 'user', content }], guardContext, locale);
    if (!guard.allowed) continue;
    valid.push(content);
    seen.add(content.toLowerCase());
    if (valid.length >= maxCount) break;
  }
  return valid;
}

export function finalizeHostCalendarSuggestions(
  llmSuggestions: string[],
  snapshot: HostCalendarSnapshot,
  guardContext: HostCalendarGuardContext,
  locale: string | undefined,
  maxCount: number,
  pricing: HostCalendarSuggestionPricing,
): string[] {
  const validated = filterValidHostCalendarSuggestions(
    llmSuggestions,
    guardContext,
    locale,
    maxCount,
    pricing,
  );
  if (validated.length >= MIN_SUGGESTIONS) return validated;
  const fallback = buildFallbackHostCalendarSuggestions(snapshot, maxCount, pricing);
  const merged = filterValidHostCalendarSuggestions(
    [...validated, ...fallback],
    guardContext,
    locale,
    maxCount,
    pricing,
  );
  return merged.length >= MIN_SUGGESTIONS
    ? merged
    : buildFallbackHostCalendarSuggestions(snapshot, maxCount, pricing);
}
