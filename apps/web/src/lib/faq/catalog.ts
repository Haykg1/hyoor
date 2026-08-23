export const FAQ_CATEGORIES = [
  'about',
  'search',
  'booking',
  'cancellations',
  'stay',
  'hosting',
  'account',
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const FAQ_ITEMS_BY_CATEGORY: Record<FaqCategory, readonly string[]> = {
  about: ['what_is', 'outside_armenia', 'who_operates'],
  search: ['how_search', 'ai_search', 'currencies'],
  booking: ['how_book', 'payments', 'deposit'],
  cancellations: ['how_cancel', 'non_refundable', 'host_cancels'],
  stay: ['is_safe', 'contact_host', 'reviews', 'report'],
  hosting: ['how_list', 'platform_fee'],
  account: ['create_account', 'languages'],
};

export const ALL_FAQ_KEYS: readonly string[] = FAQ_CATEGORIES.flatMap(
  (category) => FAQ_ITEMS_BY_CATEGORY[category],
);

export function faqItemId(key: string): string {
  return `faq-${key}`;
}
