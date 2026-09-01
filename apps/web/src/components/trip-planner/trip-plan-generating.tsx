'use client';

import type { TripPlanDetail, TripPlanProgressEvent } from '@repo/shared';
import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS: { type: TripPlanProgressEvent['type']; titleKey: string }[] = [
  { type: 'intake_complete', titleKey: 'step_intake' },
  { type: 'selecting', titleKey: 'step_selecting' },
  { type: 'arranging', titleKey: 'step_arranging' },
  { type: 'ready', titleKey: 'step_ready' },
];

interface TripPlanGeneratingProps {
  plan: TripPlanDetail;
  events: TripPlanProgressEvent[];
  onView: () => void;
}

export function TripPlanGenerating({
  plan,
  events,
  onView,
}: TripPlanGeneratingProps): React.JSX.Element {
  const t = useTranslations('trip_planner');
  const latestByType = new Map(events.map((event) => [event.type, event]));
  const failed = latestByType.get('failed');
  const ready = latestByType.has('ready') || plan.status === 'READY';
  const activeIndex = ready
    ? STEPS.length - 1
    : STEPS.findIndex((step) => !latestByType.has(step.type));
  const current = activeIndex < 0 ? STEPS.length - 1 : activeIndex;
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {t('building')}
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {plan.city} · {plan.checkIn} → {plan.checkOut}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('building_hint')}</p>
      </div>
      <ol className="space-y-4">
        {STEPS.map((step, index) => {
          const done = ready || index < current;
          const active = !ready && !failed && index === current;
          const event = latestByType.get(step.type);
          return (
            <li key={step.titleKey} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full',
                  done
                    ? 'bg-[#2E7D5B] text-white'
                    : active
                      ? 'text-primary'
                      : 'text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <div>
                <p
                  className={cn('text-sm font-medium', !done && !active && 'text-muted-foreground')}
                >
                  {t(step.titleKey)}
                </p>
                {event?.dayCount && step.type === 'arranging' ? (
                  <p className="text-xs text-muted-foreground">
                    {t('drafted_days', { count: event.dayCount })}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {failed ? <p className="text-sm text-destructive">{failed.message}</p> : null}
      {ready ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2E7D5B] text-white">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">{t('plan_ready')}</p>
              <p className="text-sm text-muted-foreground">
                {t('plan_ready_meta', {
                  days: plan.days.length,
                  stops: plan.days.reduce((sum, day) => sum + day.items.length, 0),
                })}
              </p>
            </div>
          </div>
          <Button type="button" className="h-12 w-full rounded-full" onClick={onView}>
            {t('view_plan')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
