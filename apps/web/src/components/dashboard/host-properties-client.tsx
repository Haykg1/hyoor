'use client';

import type { PropertyDetail } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { Pencil, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { PropertyCapacityModal } from './property-capacity-modal';

interface HostPropertiesClientProps {
  initialProperties: PropertyDetail[];
}

function CapacityBadge({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {label}: {count}
    </span>
  );
}

export function HostPropertiesClient({
  initialProperties,
}: HostPropertiesClientProps): React.JSX.Element {
  const t = useTranslations('dashboard');
  const tc = useTranslations('dashboard.capacity');
  const locale = useLocale();
  const [properties, setProperties] = useState(initialProperties);
  const [editing, setEditing] = useState<PropertyDetail | null>(null);

  function handleSaved(updated: PropertyDetail) {
    setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  if (properties.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">{t('properties')}</h1>
        <p className="text-muted-foreground">{tc('no_properties')}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">{t('properties')}</h1>

      <ul className="space-y-4">
        {properties.map((property) => (
          <li
            key={property.id}
            className="flex flex-col gap-4 rounded-xl border border-border p-5 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold">
                  {getLocalizedTitle(property.titleLabels, locale, property.title)}
                </h2>
                <Badge variant="outline" className="capitalize text-xs">
                  {property.status.toLowerCase()}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {property.city}
                {property.region ? `, ${property.region}` : ''}
              </p>

              {/* Capacity summary */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {property.maxGuests} {tc('total_guests_label')}
                </span>
                {property.maxAdults > 0 || property.maxChildren > 0 || property.maxInfants > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    <CapacityBadge label={tc('adults')} count={property.maxAdults} />
                    <CapacityBadge label={tc('children')} count={property.maxChildren} />
                    <CapacityBadge label={tc('infants')} count={property.maxInfants} />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{tc('no_breakdown')}</span>
                )}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setEditing(property)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {tc('edit_capacity')}
            </Button>
          </li>
        ))}
      </ul>

      {editing && (
        <PropertyCapacityModal
          property={editing}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}
