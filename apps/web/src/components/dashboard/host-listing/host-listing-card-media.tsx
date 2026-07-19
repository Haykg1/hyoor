'use client';

import type { PropertyStatus } from '@repo/shared';
import Image from 'next/image';
import type { JSX, ReactNode } from 'react';

import { StatusBadge } from '@/components/ui/status-badge';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';
import { cn } from '@/lib/utils';

interface HostListingCardMediaProps {
  coverPhotoUrl?: string;
  title: string;
  status: PropertyStatus;
  priceChip?: ReactNode;
  className?: string;
}

export function HostListingCardMedia({
  coverPhotoUrl,
  title,
  status,
  priceChip,
  className,
}: HostListingCardMediaProps): JSX.Element {
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-muted', className)}>
      <Image
        src={coverPhotoUrl ?? PROPERTY_PLACEHOLDER_IMAGE}
        alt={title}
        fill
        className="object-cover transition-transform duration-200 [@media(hover:hover)]:group-hover:scale-105"
        unoptimized={!!coverPhotoUrl}
        sizes="(max-width: 768px) 100vw, 320px"
      />
      <div className="absolute left-3 top-3 z-10">
        <StatusBadge status={status} namespace="property" />
      </div>
      {priceChip ? (
        <div className="absolute bottom-3 right-3 z-10 md:hidden">{priceChip}</div>
      ) : null}
    </div>
  );
}
