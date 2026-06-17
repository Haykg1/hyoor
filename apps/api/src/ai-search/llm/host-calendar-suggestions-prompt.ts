import { buildResponseLanguageRule, normalizeChatLocale } from '../utils/chat-locale';
import type { HostCalendarSnapshot } from '../utils/host-calendar-snapshot';
import { formatSnapshotForLlm } from '../utils/host-calendar-snapshot';

export interface HostCalendarSuggestionsPromptContext {
  locale: string;
  snapshot: HostCalendarSnapshot;
  suggestionCount: number;
}

export function buildHostCalendarSuggestionsPrompt(
  ctx: HostCalendarSuggestionsPromptContext,
): string {
  const locale = normalizeChatLocale(ctx.locale);
  const base = ctx.snapshot.property.basePricePerNight;
  const peakHint = Math.round(base * 1.2);
  const weekendHint = Math.round(base * 1.1);
  return [
    'You are a short-term rental sales advisor for a host calendar assistant.',
    buildResponseLanguageRule(locale),
    'Generate exact chat commands the host can paste into the calendar AI — not advice paragraphs.',
    formatSnapshotForLlm(ctx.snapshot),
    'OUTPUT RULES:',
    `- Return JSON only: {"suggestions":["...", "..."]} with exactly ${ctx.suggestionCount} items.`,
    '- Each suggestion is one short sentence (max 100 characters).',
    '- Every suggestion must be actionable: include concrete dates/months OR "next weekend"/"next N days", AND include price/rate/AMD/dram OR close/open/block.',
    '- For rate suggestions include a numeric AMD amount (use base rate as reference; peak ~20% higher, weekends ~10% higher).',
    `- Example peak amount: ${peakHint} AMD; example weekend amount: ${weekendHint} AMD.`,
    '- Mix availability and pricing ideas when the calendar data supports it.',
    '- Do not mention other properties or off-topic topics.',
  ].join('\n');
}
