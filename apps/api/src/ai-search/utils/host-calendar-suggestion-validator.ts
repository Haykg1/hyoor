import type { HostCalendarGuardContext } from './host-calendar-input-guard';
import { evaluateHostCalendarMessage } from './host-calendar-input-guard';
import type { HostCalendarSnapshot } from './host-calendar-snapshot';

const MIN_SUGGESTIONS = 3;

function roundPrice(base: number, multiplier: number): number {
  return Math.round(base * multiplier);
}

export function buildFallbackHostCalendarSuggestions(
  snapshot: HostCalendarSnapshot,
  maxCount: number,
): string[] {
  const base = snapshot.property.basePricePerNight;
  const { calendar } = snapshot;
  const peakPrice = roundPrice(base, 1.2);
  const weekendPrice = roundPrice(base, 1.1);
  const candidates: string[] = [
    `Set ${peakPrice} AMD per night for June 1–August 31`,
    `Set ${weekendPrice} AMD for next weekend`,
    `Close this property for the next 7 days`,
    `Close December 24–January 2`,
    `Revert August dates to base rate`,
  ];
  if (calendar.isSummerSeason) {
    candidates.unshift(
      `Set ${peakPrice} AMD per night for ${calendar.summerFrom}–${calendar.summerTo}`,
    );
  }
  return candidates.slice(0, maxCount);
}

export function filterValidHostCalendarSuggestions(
  suggestions: string[],
  guardContext: HostCalendarGuardContext,
  locale: string | undefined,
  maxCount: number,
): string[] {
  const valid: string[] = [];
  const seen = new Set<string>();
  for (const raw of suggestions) {
    const content = raw.trim();
    if (!content || seen.has(content.toLowerCase())) continue;
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
): string[] {
  const validated = filterValidHostCalendarSuggestions(
    llmSuggestions,
    guardContext,
    locale,
    maxCount,
  );
  if (validated.length >= MIN_SUGGESTIONS) return validated;
  const fallback = buildFallbackHostCalendarSuggestions(snapshot, maxCount);
  const merged = filterValidHostCalendarSuggestions(
    [...validated, ...fallback],
    guardContext,
    locale,
    maxCount,
  );
  return merged.length >= MIN_SUGGESTIONS
    ? merged
    : buildFallbackHostCalendarSuggestions(snapshot, maxCount);
}
