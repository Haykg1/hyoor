'use client';

import { cn } from '@/lib/utils';

export interface CategoryFilterOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface CategoryFilterProps<TValue extends string> {
  options: CategoryFilterOption<TValue>[];
  active: TValue;
  onChange: (value: TValue) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Reusable horizontal "chip" filter (pill-shaped buttons) used on the home page
 * and intended for the search results page. Generic over the value type so the
 * caller keeps its own enum/union without casting.
 */
export function CategoryFilter<TValue extends string>({
  options,
  active,
  onChange,
  className,
  ariaLabel,
}: CategoryFilterProps<TValue>): React.JSX.Element {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
