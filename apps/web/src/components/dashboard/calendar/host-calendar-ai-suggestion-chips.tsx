'use client';

import { useTranslations } from 'next-intl';

interface HostCalendarAiSuggestionChipsProps {
  suggestions: string[];
  isLoading: boolean;
  disabled: boolean;
  onSelect: (suggestion: string) => void;
}

export function HostCalendarAiSuggestionChips({
  suggestions,
  isLoading,
  disabled,
  onSelect,
}: HostCalendarAiSuggestionChipsProps): React.JSX.Element | null {
  const t = useTranslations('dashboard.calendar.ai');
  if (isLoading) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('suggestions_title')}</p>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-8 w-36 animate-pulse rounded-full bg-muted" aria-hidden />
          ))}
        </div>
      </div>
    );
  }
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t('suggestions_title')}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(suggestion)}
            className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
