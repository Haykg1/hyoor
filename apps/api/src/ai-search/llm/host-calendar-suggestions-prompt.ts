import { buildResponseLanguageRule, normalizeChatLocale } from '../utils/chat-locale';
import type { HostCalendarSnapshot } from '../utils/host-calendar-snapshot';
import { formatSnapshotForLlm } from '../utils/host-calendar-snapshot';
import {
  formatSuggestionRate,
  type HostCalendarSuggestionPricing,
} from '../utils/host-calendar-suggestion-pricing';

export interface HostCalendarSuggestionsPromptContext {
  locale: string;
  snapshot: HostCalendarSnapshot;
  suggestionCount: number;
  pricing: HostCalendarSuggestionPricing;
}

export function buildHostCalendarSuggestionsPrompt(
  ctx: HostCalendarSuggestionsPromptContext,
): string {
  const locale = normalizeChatLocale(ctx.locale);
  const { pricing } = ctx;
  const peakExample = formatSuggestionRate(
    pricing.peakDisplay,
    pricing.displayCurrency,
    pricing.peakUsd,
    pricing.settlementCurrency,
  );
  const weekendExample = formatSuggestionRate(
    pricing.weekendDisplay,
    pricing.displayCurrency,
    pricing.weekendUsd,
    pricing.settlementCurrency,
  );
  const settlementNote =
    pricing.displayCurrency === pricing.settlementCurrency
      ? `Rate amounts use ${pricing.settlementCurrency} (settlement currency).`
      : `Rate amounts use ${pricing.displayCurrency} for the host's display currency, and MUST also include (~N ${pricing.settlementCurrency}) with the settlement amount.`;
  return [
    'You are a short-term rental sales advisor for a host calendar assistant.',
    buildResponseLanguageRule(locale),
    'Generate exact chat commands the host can paste into the calendar AI — not advice paragraphs.',
    formatSnapshotForLlm(ctx.snapshot),
    `Display currency for suggestions: ${pricing.displayCurrency}. Settlement currency: ${pricing.settlementCurrency}.`,
    `Converted base rate for display: ${pricing.baseDisplay} ${pricing.displayCurrency}/night.`,
    settlementNote,
    'OUTPUT RULES:',
    `- Return JSON only: {"suggestions":["...", "..."]} with exactly ${ctx.suggestionCount} items.`,
    '- Each suggestion is one short sentence (max 120 characters).',
    `- Every suggestion must be actionable: include concrete dates/months OR "next weekend"/"next N days", AND include price/rate/${pricing.displayCurrency} OR close/open/block.`,
    `- For rate suggestions include a numeric ${pricing.displayCurrency} amount (use converted base as reference; peak ~20% higher, weekends ~10% higher).`,
    pricing.displayCurrency !== pricing.settlementCurrency
      ? `- When including a rate, always append (~N ${pricing.settlementCurrency}) using the matching settlement amount.`
      : `- Rate amounts are in ${pricing.settlementCurrency}.`,
    `- Example peak amount: ${peakExample}; example weekend amount: ${weekendExample}.`,
    '- Mix availability and pricing ideas when the calendar data supports it.',
    '- Do not mention other properties or off-topic topics.',
  ].join('\n');
}
