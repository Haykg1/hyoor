'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AMENITIES_CATALOG } from '@/lib/listing/amenities-catalog';
import type { ListingFormValues } from '@/lib/listing/schema';

interface AmenityMultiSelectProps {
  selected: ListingFormValues['amenities'];
  onChange: (amenities: ListingFormValues['amenities']) => void;
}

export function AmenityMultiSelect({
  selected,
  onChange,
}: AmenityMultiSelectProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.media');
  const [search, setSearch] = useState('');
  const selectedNames = useMemo(() => new Set(selected.map((a) => a.name)), [selected]);
  const query = search.trim().toLowerCase();
  const pinned = AMENITIES_CATALOG.filter((a) => a.pinned);
  const rest = AMENITIES_CATALOG.filter((a) => !a.pinned).filter(
    (a) => !query || a.name.toLowerCase().includes(query),
  );
  function toggle(name: string, category?: string, iconKey?: string) {
    if (selectedNames.has(name)) {
      onChange(selected.filter((a) => a.name !== name));
      return;
    }
    onChange([...selected, { name, category, iconKey }]);
  }
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="amenity-search">{t('amenities_label')}</Label>
        <Input
          id="amenity-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('amenities_search')}
          className="mt-2"
        />
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('pinned')}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pinned.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <Checkbox
                checked={selectedNames.has(item.name)}
                onCheckedChange={() => toggle(item.name, item.category, item.iconKey)}
              />
              {item.name}
            </label>
          ))}
        </div>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rest.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <Checkbox
                checked={selectedNames.has(item.name)}
                onCheckedChange={() => toggle(item.name, item.category, item.iconKey)}
              />
              {item.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
