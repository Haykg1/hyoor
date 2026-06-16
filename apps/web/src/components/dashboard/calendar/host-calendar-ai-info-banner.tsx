'use client';

import type { AiSearchQuota } from '@repo/shared';
import { useTranslations } from 'next-intl';

interface HostCalendarAiInfoBannerProps {
  quota: AiSearchQuota | null;
  isLoading: boolean;
  propertyTitle: string;
}

export function HostCalendarAiInfoBanner({
  quota,
  isLoading,
  propertyTitle,
}: HostCalendarAiInfoBannerProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.ai_info');
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {t('loading')}
      </div>
    );
  }
  const limit = quota?.limit ?? 20;
  const remaining = quota?.remaining ?? limit;
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <p>{t('quota_label', { limit, remaining })}</p>
      <div>
        <p className="font-medium text-foreground">{t('capabilities_title')}</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>{t('capability_open_close')}</li>
          <li>{t('capability_set_rate')}</li>
          <li>{t('capability_revert_base')}</li>
          <li>{t('capability_undo')}</li>
        </ul>
      </div>
      <p>{t('current_property_only', { propertyTitle })}</p>
    </div>
  );
}
