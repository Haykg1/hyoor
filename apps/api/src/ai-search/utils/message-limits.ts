import type { AiSearchMessage } from '@repo/shared';

export function truncateAiSearchMessages(
  messages: AiSearchMessage[],
  maxMessages: number,
  maxCharsPerMessage: number,
): AiSearchMessage[] {
  return messages.slice(-maxMessages).map((message) => ({
    role: message.role,
    content: truncateMessageContent(message.content, maxCharsPerMessage),
  }));
}

export function truncateMessageContent(content: string, maxChars: number): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1)}…`;
}
