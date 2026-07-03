import sanitizeHtml from 'sanitize-html';

const GUEST_INSTRUCTIONS_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'a',
  'h2',
  'h3',
] as const;

export function sanitizeGuestInstructionsHtml(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const sanitized = sanitizeHtml(trimmed, {
    allowedTags: [...GUEST_INSTRUCTIONS_ALLOWED_TAGS],
    allowedAttributes: {
      a: ['href'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
  const result = sanitized.trim();
  return result || undefined;
}
