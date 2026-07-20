'use client';

import { CheckCircle2 } from 'lucide-react';
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
    <div className="mt-2 space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100">
      <p className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        {t('applied_title')}
      </p>
      <p>{message}</p>
      {revertHint ? (
        <p className="text-emerald-800/70 dark:text-emerald-200/80">{revertHint}</p>
      ) : null}
    </div>
  );
}
