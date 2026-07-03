'use client';

import { useTranslations } from 'next-intl';

interface AiSearchCapabilitiesBannerProps {
  variant?: 'banner' | 'message';
  onExampleClick?: (prompt: string) => void;
}

export function AiSearchCapabilitiesBanner({
  variant = 'banner',
  onExampleClick,
}: AiSearchCapabilitiesBannerProps): React.JSX.Element {
  const t = useTranslations('ai_search.capabilities');
  const examplePrompt = t('example_prompt');
  const content = (
    <>
      <p className="font-medium text-foreground">{t('title')}</p>
      <ul className="mt-2 list-inside list-disc space-y-0.5">
        <li>{t('bullet_location')}</li>
        <li>{t('bullet_dates')}</li>
        <li>{t('bullet_guests')}</li>
        <li>{t('bullet_amenities')}</li>
      </ul>
      <div className="mt-3 rounded-md border border-border/40 bg-background/60 px-3 py-2">
        <p className="text-xs font-medium text-foreground">{t('example_label')}</p>
        {onExampleClick ? (
          <button
            type="button"
            onClick={() => onExampleClick(examplePrompt)}
            className="mt-1 w-full text-left text-xs italic text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            &ldquo;{examplePrompt}&rdquo;
          </button>
        ) : (
          <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{examplePrompt}&rdquo;</p>
        )}
      </div>
      <p className="mt-2 text-xs">{t('off_topic_hint')}</p>
    </>
  );
  if (variant === 'message') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl border border-border/60 bg-muted/50 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-3 space-y-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      {content}
    </div>
  );
}
