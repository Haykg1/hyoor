'use client';

import type { HostAnalyticsPreset, HostListingSummary } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { Download } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { JSX } from 'react';

import { DisplayCurrencyToggle } from '@/components/currency/display-currency-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDisplayMoney } from '@/hooks/use-display-money';

interface AnalyticsPageHeaderProps {
  subtitle: string;
  preset: HostAnalyticsPreset;
  customFrom: string;
  customTo: string;
  propertyId: string;
  properties: HostListingSummary[];
  canExport: boolean;
  onPresetChange: (preset: HostAnalyticsPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onPropertyChange: (propertyId: string) => void;
  onExport: () => void;
}

export function AnalyticsPageHeader({
  subtitle,
  preset,
  customFrom,
  customTo,
  propertyId,
  properties,
  canExport,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  onPropertyChange,
  onExport,
}: AnalyticsPageHeaderProps): JSX.Element {
  const t = useTranslations('dashboard.analytics');
  const locale = useLocale();
  const { displayCurrency, setDisplayCurrency } = useDisplayMoney();
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <DisplayCurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} />
        <div className="space-y-1.5">
          <Label htmlFor="analytics-property" className="sr-only">
            {t('property_label')}
          </Label>
          <select
            id="analytics-property"
            className="flex h-9 min-w-[12rem] max-w-[16rem] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={propertyId}
            onChange={(e) => onPropertyChange(e.target.value)}
          >
            <option value="">{t('property_all')}</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {getLocalizedTitle(property.titleLabels, locale, property.title)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="analytics-preset" className="sr-only">
            {t('range_label')}
          </Label>
          <select
            id="analytics-preset"
            className="flex h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as HostAnalyticsPreset)}
          >
            <option value="last_30_days">{t('presets.last_30_days')}</option>
            <option value="last_90_days">{t('presets.last_90_days')}</option>
            <option value="this_year">{t('presets.this_year')}</option>
            <option value="custom">{t('presets.custom')}</option>
          </select>
        </div>
        {preset === 'custom' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="analytics-from">{t('from')}</Label>
              <Input
                id="analytics-from"
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="h-9 w-auto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="analytics-to">{t('to')}</Label>
              <Input
                id="analytics-to"
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="h-9 w-auto"
              />
            </div>
          </>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!canExport}
          onClick={onExport}
        >
          <Download className="h-4 w-4" />
          {t('export')}
        </Button>
      </div>
    </div>
  );
}
