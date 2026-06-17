import type { AiSearchMessage } from '@repo/shared';

import { buildOtherPropertyMessage, getHostCalendarOffTopicMessage } from './chat-locale';

/** @deprecated Use getHostCalendarOffTopicMessage(locale) */
export const HOST_CALENDAR_OFF_TOPIC_MESSAGE = getHostCalendarOffTopicMessage('en');

export interface HostCalendarGuardContext {
  currentPropertyTitle: string;
  currentPropertyCity: string;
  otherPropertyTitles: string[];
}

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(write|generate|create)\b.{0,40}\b(code|script|program|essay|poem|story|joke)\b/i,
  /\b(python|javascript|typescript|react|nestjs)\b/i,
  /\bwho\s+(is|was|are|were)\b/i,
  /\b(find|search|look(ing)?\s+for)\b.{0,30}\b(place|stay|rental|apartment)\b/i,
  /\b(book|booking)\b.{0,20}\b(guest|reservation)\b/i,
  /\b(amenit|wifi|pool)\b/i,
  /\b(base\s+price|price\s+per\s+night)\b.{0,20}\b(property|listing)\b/i,
];

const OTHER_PROPERTY_PATTERNS: RegExp[] = [
  /\bmy\s+other\s+(listing|property|apartment|house|villa)\b/i,
  /\b(also|too)\s+(close|open|block|update|change)\b/i,
  /\banother\s+(listing|property|apartment|house|villa)\b/i,
  /\bother\s+listing\b/i,
];

const CALENDAR_SIGNAL_PATTERNS: RegExp[] = [
  /\b(open|close|block|unblock|available|unavailable)\b/i,
  /\b(rate|pric(e|y|es|ing)|amd|dram)\b/i,
  /\b(expensive|pricey|cheaper|increase|decrease|raise|lower)\b/i,
  /\b(summer|winter|spring|fall|autumn)\b/i,
  /\b(check[\s-]?in|check[\s-]?out|night|nights)\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(weekend|tonight|tomorrow|next\s+week|this\s+week)\b/i,
  /\bnext\s*\d+\s*days?\b/i,
  /\b\d+\s*days?\b/i,
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?\b/,
  /\b(revert|undo|change\s+back|base\s+rate)\b/i,
  /\b(calendar|availability)\b/i,
];

function hasCalendarSignals(content: string): boolean {
  return CALENDAR_SIGNAL_PATTERNS.some((pattern) => pattern.test(content));
}

function isFollowUpInThread(content: string, messages: AiSearchMessage[]): boolean {
  const hasAssistant = messages.some((m) => m.role === 'assistant');
  if (!hasAssistant) return false;
  if (content.trim().length > 120) return false;
  if (/\d/.test(content)) return true;
  return /\b(yes|no|ok|okay|sure|confirm|cancel|thanks|please)\b/i.test(content);
}

function mentionsOtherProperty(content: string, context: HostCalendarGuardContext): boolean {
  const lower = content.toLowerCase();
  if (OTHER_PROPERTY_PATTERNS.some((pattern) => pattern.test(content))) {
    return true;
  }
  for (const title of context.otherPropertyTitles) {
    const titleLower = title.toLowerCase().trim();
    if (titleLower.length >= 4 && lower.includes(titleLower)) {
      return true;
    }
  }
  const cityPattern = /\b(yerevan|gyumri|dilijan|sevan|garni|tsaghkadzor|vanadzor|jermuk)\b/gi;
  const cities = [...content.matchAll(cityPattern)].map((m) => m[0]!.toLowerCase());
  const currentCity = context.currentPropertyCity.toLowerCase();
  for (const city of cities) {
    if (city !== currentCity) return true;
  }
  return false;
}

export type HostCalendarGuardResult = { allowed: true } | { allowed: false; message: string };

export function evaluateHostCalendarMessage(
  messages: AiSearchMessage[],
  context: HostCalendarGuardContext,
  locale?: string,
): HostCalendarGuardResult {
  const offTopicMessage = getHostCalendarOffTopicMessage(locale);
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return { allowed: true };
  const content = lastUser.content.trim();
  if (!content) return { allowed: false, message: offTopicMessage };
  if (mentionsOtherProperty(content, context)) {
    return {
      allowed: false,
      message: buildOtherPropertyMessage(context.currentPropertyTitle, locale),
    };
  }
  if (isFollowUpInThread(content, messages)) return { allowed: true };
  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(content)) && !hasCalendarSignals(content)) {
    return { allowed: false, message: offTopicMessage };
  }
  if (hasCalendarSignals(content)) return { allowed: true };
  if (content.length <= 40 && /\b(help|rate|date|close|open)\b/i.test(content)) {
    return { allowed: true };
  }
  return { allowed: false, message: offTopicMessage };
}
