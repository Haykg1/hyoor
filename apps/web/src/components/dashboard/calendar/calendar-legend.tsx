'use client';

import { useTranslations } from 'next-intl';

export function CalendarLegend(): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.legend');
  const items: Array<{ key: string; className: string }> = [
    { key: 'available', className: 'border-border bg-card' },
    { key: 'custom_rate', className: 'border-primary/40 bg-primary/5' },
    { key: 'closed', className: 'border-border bg-muted' },
    { key: 'booked', className: 'border-amber-300/70 bg-amber-50 dark:bg-amber-950/40' },
    { key: 'selected', className: 'border-primary bg-primary/15 ring-2 ring-primary' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className={`h-4 w-4 rounded-sm border ${item.className}`} aria-hidden />
          <span>{t(item.key)}</span>
        </div>
      ))}
    </div>
  );
}
