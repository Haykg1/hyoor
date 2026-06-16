'use client';

import type { HostCalendarChangeEntry } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { formatAmd } from '@/lib/format/price';

interface HostCalendarChangePreviewProps {
  entries: HostCalendarChangeEntry[];
  dateFrom: string;
  dateTo: string;
  basePricePerNight: number;
  isConfirming: boolean;
  status: 'pending' | 'confirmed' | 'cancelled' | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HostCalendarChangePreview({
  entries,
  dateFrom,
  dateTo,
  basePricePerNight,
  isConfirming,
  status,
  onConfirm,
  onCancel,
}: HostCalendarChangePreviewProps): React.JSX.Element | null {
  const t = useTranslations('dashboard.calendar.ai');
  if (status === 'cancelled') {
    return <p className="text-sm text-muted-foreground">{t('preview_cancelled')}</p>;
  }
  if (status === 'confirmed') {
    return null;
  }
  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-medium">
        {t('preview_title', { from: dateFrom, to: dateTo, count: entries.length })}
      </p>
      <div className="max-h-40 overflow-y-auto text-xs">
        <table className="w-full">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-1">{t('preview_date')}</th>
              <th className="pb-1">{t('preview_status')}</th>
              <th className="pb-1">{t('preview_rate')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 14).map((entry) => (
              <tr key={entry.date} className="border-t border-border/50">
                <td className="py-1">{entry.date}</td>
                <td className="py-1">
                  {entry.isAvailable ? t('preview_open') : t('preview_closed')}
                </td>
                <td className="py-1">
                  {entry.priceOverride === null || entry.priceOverride === undefined
                    ? t('preview_base_rate', { base: formatAmd(basePricePerNight) })
                    : formatAmd(entry.priceOverride)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length > 14 ? (
          <p className="mt-1 text-muted-foreground">
            {t('preview_more', { count: entries.length - 14 })}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? t('confirming') : t('confirm')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isConfirming}
        >
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
