'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface RatingFilterProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

function StarHalfHit({
  filled,
  halfFilled,
  onPickFull,
  onPickHalf,
  onHoverHalf,
  onHoverFull,
  labelFull,
  labelHalf,
}: {
  filled: boolean;
  halfFilled: boolean;
  onPickFull: () => void;
  onPickHalf: () => void;
  onHoverHalf: () => void;
  onHoverFull: () => void;
  labelFull: string;
  labelHalf: string;
}): React.JSX.Element {
  return (
    <span className="relative inline-flex h-7 w-7 shrink-0">
      <Star className="h-7 w-7 text-muted-foreground/35" aria-hidden />
      {filled ? (
        <Star className="absolute inset-0 h-7 w-7 fill-primary text-primary" aria-hidden />
      ) : null}
      {halfFilled && !filled ? (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <Star className="h-7 w-7 fill-primary text-primary" aria-hidden />
        </span>
      ) : null}
      <button
        type="button"
        className="absolute inset-y-0 left-0 z-10 w-1/2"
        aria-label={labelHalf}
        onClick={onPickHalf}
        onMouseEnter={onHoverHalf}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-10 w-1/2"
        aria-label={labelFull}
        onClick={onPickFull}
        onMouseEnter={onHoverFull}
      />
    </span>
  );
}

export function RatingFilter({ value, onChange }: RatingFilterProps): React.JSX.Element {
  const t = useTranslations('search.filters');
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);
  const displayValue = hoverValue ?? value;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('guest_rating')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium',
            value === undefined && hoverValue === undefined
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:bg-muted',
          )}
        >
          {t('rating_any')}
        </button>
        <div
          className="flex items-center gap-0.5"
          role="group"
          aria-label={t('guest_rating')}
          onMouseLeave={() => setHoverValue(undefined)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = (displayValue ?? 0) >= star;
            const halfFilled = !filled && (displayValue ?? 0) >= star - 0.5;
            return (
              <StarHalfHit
                key={star}
                filled={filled}
                halfFilled={halfFilled}
                onHoverHalf={() => setHoverValue(star - 0.5)}
                onHoverFull={() => setHoverValue(star)}
                onPickHalf={() => onChange(star - 0.5)}
                onPickFull={() => onChange(star)}
                labelHalf={t('rating_plus', { rating: star - 0.5 })}
                labelFull={t('rating_plus', { rating: star })}
              />
            );
          })}
        </div>
      </div>
      {/* {displayValue !== undefined ? (
        <p className="text-xs text-muted-foreground">
          {t('rating_plus', { rating: displayValue })}
        </p>
      ) : null} */}
    </div>
  );
}
