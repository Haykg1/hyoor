'use client';

import type { HostListingSummary } from '@repo/shared';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PropertySelectFieldProps {
  id: string;
  label: string;
  listings: HostListingSummary[];
  value: string;
  onChange: (propertyId: string) => void;
  placeholder: string;
  className?: string;
}

export function PropertySelectField({
  id,
  label,
  listings,
  value,
  onChange,
  placeholder,
  className,
}: PropertySelectFieldProps): React.JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={listings.length === 0}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {listings.map((listing) => (
          <option key={listing.id} value={listing.id}>
            {listing.title}
          </option>
        ))}
      </select>
    </div>
  );
}
