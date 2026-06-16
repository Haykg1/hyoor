'use client';

import type { AiSearchExtractedFilters } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { extractedFiltersToChips } from '@/lib/ai-search/filters-display';

interface AiSearchFilterChipsProps {
  filters: AiSearchExtractedFilters;
  searchPath?: string;
}

export function AiSearchFilterChips({
  filters,
  searchPath,
}: AiSearchFilterChipsProps): React.JSX.Element {
  const t = useTranslations('ai_search');
  const router = useRouter();
  const chips = extractedFiltersToChips(filters);
  if (chips.length === 0) return <></>;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('searching_for')}
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Badge key={chip.key} variant="secondary" className="font-normal">
            {chip.label}
          </Badge>
        ))}
      </div>
      {searchPath ? (
        <Button type="button" variant="outline" size="sm" onClick={() => router.push(searchPath)}>
          {t('view_all_results')}
        </Button>
      ) : null}
    </div>
  );
}
