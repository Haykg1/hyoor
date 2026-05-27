'use client';

import { formatAmd } from '@/lib/format/price';

interface PriceFormatter {
  formatAmd: (amount: number) => string;
}

export function usePriceFormatter(): PriceFormatter {
  return { formatAmd };
}
