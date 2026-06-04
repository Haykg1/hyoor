'use client';

import type { PropertyDetail } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProperty } from '@/lib/api/properties';

interface PropertyCapacityModalProps {
  property: PropertyDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: PropertyDetail) => void;
}

export function PropertyCapacityModal({
  property,
  open,
  onOpenChange,
  onSaved,
}: PropertyCapacityModalProps): React.JSX.Element {
  const t = useTranslations('dashboard.capacity');
  const locale = useLocale();
  const [maxGuests, setMaxGuests] = useState(property.maxGuests);
  const [maxAdults, setMaxAdults] = useState(property.maxAdults);
  const [maxChildren, setMaxChildren] = useState(property.maxChildren);
  const [maxInfants, setMaxInfants] = useState(property.maxInfants);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMaxGuests(property.maxGuests);
    setMaxAdults(property.maxAdults);
    setMaxChildren(property.maxChildren);
    setMaxInfants(property.maxInfants);
  }, [open, property]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProperty(property.id, {
        maxGuests,
        maxAdults,
        maxChildren,
        maxInfants,
      });
      toast.success(t('save_success'));
      onSaved(updated);
      onOpenChange(false);
    } catch {
      toast.error(t('save_error'));
    } finally {
      setSaving(false);
    }
  }

  function numInput(
    label: string,
    hint: string,
    value: number,
    onChange: (v: number) => void,
    min = 0,
  ) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <Input
          type="number"
          min={min}
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
          className="w-28"
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {getLocalizedTitle(property.titleLabels, locale, property.title)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-5 pt-2">
          {numInput(t('total_guests'), t('total_guests_hint'), maxGuests, setMaxGuests, 1)}
          {numInput(t('adults'), t('adults_hint'), maxAdults, setMaxAdults)}
          {numInput(t('children'), t('children_hint'), maxChildren, setMaxChildren)}
          {numInput(t('infants'), t('infants_hint'), maxInfants, setMaxInfants)}
        </div>

        <p className="text-xs text-muted-foreground">{t('hint')}</p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
