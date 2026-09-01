'use client';

import type {
  TripPlanPreferences,
  TripPlanStaySnapshot,
  TripPlannerQuestionId,
  TripPlannerQuotaView,
} from '@repo/shared';
import {
  TRIP_PLANNER_QUESTIONS,
  nextUnansweredQuestion,
  resolveLocalizedLabel,
} from '@repo/shared';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TripPlanIntakeProps {
  stay: TripPlanStaySnapshot | null;
  initialPreferences?: TripPlanPreferences;
  initialGuestCount?: number;
  quota: TripPlannerQuotaView | null;
  saving: boolean;
  onGenerate: (preferences: TripPlanPreferences, guestCount: number) => void;
}

export function TripPlanIntake({
  stay,
  initialPreferences,
  initialGuestCount,
  quota,
  saving,
  onGenerate,
}: TripPlanIntakeProps): React.JSX.Element {
  const t = useTranslations('trip_planner');
  const locale = useLocale();
  const [preferences, setPreferences] = useState<TripPlanPreferences>(initialPreferences ?? {});
  const [guestCount, setGuestCount] = useState(initialGuestCount ?? stay?.guestCount ?? 2);
  const remainingPlans = quota ? Math.floor(quota.unitsRemaining / 4) : null;
  const usedSegments = quota ? Math.min(4, Math.floor(quota.used)) : 0;
  const unanswered = nextUnansweredQuestion(preferences);
  function selectOption(questionId: TripPlannerQuestionId, optionId: string): void {
    setPreferences((current) => ({ ...current, [questionId]: optionId }));
  }
  return (
    <div className="space-y-6">
      {stay ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex gap-4 p-4">
            {stay.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stay.coverPhotoUrl}
                alt={stay.title}
                className="h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{stay.title}</p>
              <p className="text-sm text-muted-foreground">
                {stay.city}, {stay.country}
              </p>
              <p className="mt-1 text-sm">
                {t('nightly_price', {
                  amount: stay.nightlyMinor.toLocaleString(locale),
                  currency: stay.currency,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm font-medium">{t('guests')}</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                disabled={guestCount <= 1 || saving}
                onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-4 text-center text-sm font-semibold">{guestCount}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                disabled={guestCount >= 20 || saving}
                onClick={() => setGuestCount((n) => Math.min(20, n + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {quota ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-2 flex-1 rounded-full',
                  index < usedSegments ? 'bg-primary' : 'bg-muted',
                )}
              />
            ))}
          </div>
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            {t('quota_left', { remaining: remainingPlans ?? 0, limit: quota.limit })}
          </p>
        </div>
      ) : null}
      {TRIP_PLANNER_QUESTIONS.map((question) => (
        <div key={question.id} className="space-y-3">
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm font-medium">
            {resolveLocalizedLabel(question.labels, locale)}
          </div>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => {
              const selected = preferences[question.id] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={saving}
                  onClick={() => selectOption(question.id, option.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80',
                  )}
                >
                  {resolveLocalizedLabel(option.labels, locale)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="space-y-2">
        <Button
          type="button"
          className="h-12 w-full rounded-full"
          disabled={Boolean(unanswered) || saving}
          onClick={() => onGenerate(preferences, guestCount)}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('build_plan')}
        </Button>
        {unanswered ? (
          <p className="text-center text-xs text-muted-foreground">{t('answer_all')}</p>
        ) : null}
      </div>
    </div>
  );
}
