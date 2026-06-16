import type { AiSearchMessage } from '@repo/shared';

import { getAiSearchOffTopicMessage } from './chat-locale';

/** @deprecated Use getAiSearchOffTopicMessage(locale) */
export const AI_SEARCH_OFF_TOPIC_MESSAGE = getAiSearchOffTopicMessage('en');

const HOST_MANAGEMENT_PATTERNS: RegExp[] = [
  /\b(close|open|block)\b.{0,30}\b(date|calendar|availability)\b/i,
  /\b(set|change)\b.{0,20}\b(rate|price)\b.{0,20}\b(night|calendar)\b/i,
  /\bmy\s+(listing|property)\b.{0,20}\b(calendar|availability)\b/i,
  /\b(host|hosting)\b.{0,20}\b(calendar|availability|rate)\b/i,
];

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(write|generate|create)\b.{0,40}\b(code|script|program|essay|poem|story|joke|song|email)\b/i,
  /\b(python|javascript|typescript|react|nestjs|sql|html|css)\b/i,
  /\b(homework|exam|assignment|solve\s+this|math\s+problem)\b/i,
  /\b(bitcoin|crypto|stock\s+market|forex|nft)\b/i,
  /\b(recipe|cooking|workout|diet\s+plan)\b/i,
  /\b(translate|translation)\b.{0,30}\b(to|into)\b/i,
  /\bwho\s+(is|was|are|were)\b/i,
  /\bwhat\s+is\s+the\s+(capital|population|president)\b/i,
  /\btell\s+me\s+a\s+(joke|story)\b/i,
  /\b(politic|religion|celebrity|gossip)\b/i,
];

const PROPERTY_SIGNAL_PATTERNS: RegExp[] = [
  /\b(stay|rent|rental|book|booking|apartment|house|villa|cottage|hotel|hostel|property|accommodation|room|guest|night|nights)\b/i,
  /\b(check[\s-]?in|check[\s-]?out|arrival|departure)\b/i,
  /\b(yerevan|gyumri|dilijan|sevan|garni|tsaghkadzor|vanadzor|jermuk|goris|kapan|armenia|abovyan|hrazdan|ashtarak)\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(weekend|tonight|tomorrow|next\s+week|this\s+week)\b/i,
  /\b(bed(room)?s?|bath(room)?s?|amenit|wifi|pool|parking|pet|pets|budget|price|amd|dram)\b/i,
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?\b/,
  /\b\d+\s*(guest|people|person|adult|kid|child)\b/i,
];

const TRAVEL_INTENT_PATTERNS: RegExp[] = [
  /\b(find|search|look(ing)?\s+for)\b.{0,30}\b(place|stay|rental|apartment|property|accommodation)\b/i,
  /\b(need|want)\b.{0,20}\b(place|stay|rental|apartment|room)\b/i,
  /\bwhere\s+(can|should|do)\s+i\s+stay\b/i,
  /\bhow\s+much\b.{0,30}\b(night|stay|rent)\b/i,
];

function hasPropertySignals(content: string): boolean {
  return (
    PROPERTY_SIGNAL_PATTERNS.some((pattern) => pattern.test(content)) ||
    TRAVEL_INTENT_PATTERNS.some((pattern) => pattern.test(content))
  );
}

function isFollowUpInSearchThread(content: string, messages: AiSearchMessage[]): boolean {
  const hasAssistantReply = messages.some((message) => message.role === 'assistant');
  if (!hasAssistantReply) return false;
  const trimmed = content.trim();
  if (trimmed.length > 120) return false;
  if (hasPropertySignals(trimmed)) return true;
  if (/\d/.test(trimmed)) return true;
  return /\b(yes|no|ok|okay|sure|maybe|thanks|please|that works|sounds good)\b/i.test(trimmed);
}

export function isAiSearchOnTopic(messages: AiSearchMessage[]): boolean {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUser) return true;
  const content = lastUser.content.trim();
  if (!content) return false;
  if (isFollowUpInSearchThread(content, messages)) return true;
  if (HOST_MANAGEMENT_PATTERNS.some((pattern) => pattern.test(content))) {
    return false;
  }
  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(content)) && !hasPropertySignals(content)) {
    return false;
  }
  if (hasPropertySignals(content)) return true;
  if (content.length <= 40 && /\b(place|stay|rent|help)\b/i.test(content)) return true;
  return false;
}
