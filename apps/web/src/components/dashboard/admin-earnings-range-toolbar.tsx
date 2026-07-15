'use client';

import type { EarningsPreset } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminEarningsRangeToolbarProps {
  preset: EarningsPreset;
  from: string;
  to: string;
  onPresetChange: (preset: EarningsPreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function AdminEarningsRangeToolbar({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
}: AdminEarningsRangeToolbarProps): React.JSX.Element {
  const t = useTranslations('dashboard.stats');
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="earnings-preset">{t('earnings_preset')}</Label>
        <select
          id="earnings-preset"
          className="flex h-9 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as EarningsPreset)}
        >
          <option value="last_30_days">{t('earnings_presets.last_30_days')}</option>
          <option value="last_year">{t('earnings_presets.last_year')}</option>
          <option value="custom">{t('earnings_presets.custom')}</option>
        </select>
      </div>
      {preset === 'custom' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="earnings-from">{t('earnings_from')}</Label>
            <Input
              id="earnings-from"
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="h-9 w-auto"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="earnings-to">{t('earnings_to')}</Label>
            <Input
              id="earnings-to"
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="h-9 w-auto"
            />
          </div>
        </>
      )}
    </div>
  );
}
