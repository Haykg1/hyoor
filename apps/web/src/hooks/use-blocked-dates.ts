'use client';

import { useEffect, useMemo, useState } from 'react';

import { getBlockedDates, getDefaultDateRange } from '@/lib/api/availability';

function parseBlockedDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function useBlockedDates(propertyId: string): {
  blockedDates: Date[];
  isLoading: boolean;
} {
  const [blockedStrings, setBlockedStrings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { from, to } = getDefaultDateRange();
    setIsLoading(true);
    getBlockedDates(propertyId, from, to)
      .then(setBlockedStrings)
      .catch(() => setBlockedStrings([]))
      .finally(() => setIsLoading(false));
  }, [propertyId]);

  const blockedDates = useMemo(() => blockedStrings.map(parseBlockedDate), [blockedStrings]);

  return { blockedDates, isLoading };
}
