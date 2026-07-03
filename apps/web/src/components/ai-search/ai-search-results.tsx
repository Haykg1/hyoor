'use client';

import type { AiSearchPropertyResult } from '@repo/shared';

import { PropertyCard } from '@/components/property';

interface AiSearchResultsProps {
  properties: AiSearchPropertyResult[];
}

export function AiSearchResults({ properties }: AiSearchResultsProps): React.JSX.Element | null {
  if (properties.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} showSuggestedDates />
      ))}
    </div>
  );
}
