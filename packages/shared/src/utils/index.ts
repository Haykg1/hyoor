export * from './poi-city';
export * from './poi-match';
export * from './geo-distance';
export * from './search-dates';
export * from './property-type';
export * from './search-intent';
export * from './host-calendar-suggestion-currency';
export * from './cancellation-fee';
export * from './stay-fee-rules';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): { data: T[]; total: number; totalPages: number } {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total: items.length,
    totalPages: Math.ceil(items.length / limit),
  };
}
