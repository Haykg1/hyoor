'use client';

import { useTranslations } from 'next-intl';

interface HostCalendarAppliedCardProps {
  message: string;
  revertHint?: string;
}

export function HostCalendarAppliedCard({
  message,
  revertHint,
}: HostCalendarAppliedCardProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.ai');
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <p className="font-medium text-foreground">{t('applied_title')}</p>
      <p>{message}</p>
      {revertHint ? <p className="text-muted-foreground">{revertHint}</p> : null}
    </div>
  );
}
