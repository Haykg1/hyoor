import { useTranslations } from 'next-intl';

import { AiSearchPanel } from '@/components/ai-search';

export default function AiSearchPage(): React.JSX.Element {
  const t = useTranslations('ai_search');
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-muted-foreground">{t('page_subtitle')}</p>
      <div className="min-h-0 flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
        <AiSearchPanel className="flex h-full min-h-0 flex-col" />
      </div>
    </div>
  );
}
