'use client';

import { useTranslations } from 'next-intl';

export function AiSearchCapabilitiesBanner(): React.JSX.Element {
  const t = useTranslations('ai_search.capabilities');
  return (
    <div className="mb-3 space-y-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{t('title')}</p>
      <ul className="list-inside list-disc space-y-0.5">
        <li>{t('bullet_location')}</li>
        <li>{t('bullet_dates')}</li>
        <li>{t('bullet_guests')}</li>
        <li>{t('bullet_amenities')}</li>
      </ul>
      <p className="text-xs">{t('off_topic_hint')}</p>
    </div>
  );
}
