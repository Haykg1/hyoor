'use client';

import type {
  TripPlanDetail,
  TripPlanPreferences,
  TripPlanProgressEvent,
  TripPlannerQuotaView,
} from '@repo/shared';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { TripPlanGenerating } from '@/components/trip-planner/trip-plan-generating';
import { TripPlanIntake } from '@/components/trip-planner/trip-plan-intake';
import { TripPlanTimeline } from '@/components/trip-planner/trip-plan-timeline';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import {
  generateTripPlan,
  getTripPlan,
  getTripPlannerQuota,
  swapTripPlanItem,
} from '@/lib/api/trip-planner';
import { connectTripPlanStream } from '@/lib/trip-planner/stream';

export default function TripPlanPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('trip_planner');
  const locale = useLocale();
  const router = useRouter();
  const [plan, setPlan] = useState<TripPlanDetail | null>(null);
  const [quota, setQuota] = useState<TripPlannerQuotaView | null>(null);
  const [events, setEvents] = useState<TripPlanProgressEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewReady, setViewReady] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [detail, quotaView] = await Promise.all([getTripPlan(id), getTripPlannerQuota()]);
    setPlan(detail);
    setQuota(quotaView);
    setEvents(detail.progress);
    if (detail.status === 'READY' || detail.status === 'PLANNED') setViewReady(true);
  }, [id]);

  useEffect(() => {
    void load()
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/auth/login?next=/trips/planner/${id}`);
          return;
        }
        router.replace('/trips/planner');
      })
      .finally(() => setLoading(false));
  }, [id, load, router]);

  useEffect(() => {
    if (!plan || (plan.status !== 'GENERATING' && plan.status !== 'DRAFT')) return;
    if (plan.status !== 'GENERATING') return;
    return connectTripPlanStream(
      plan.id,
      (event) => {
        setEvents((current) => [...current.filter((entry) => entry.type !== event.type), event]);
        if (event.type === 'ready' || event.type === 'failed') {
          void load();
        }
      },
      () => undefined,
    );
  }, [load, plan]);

  async function handleGenerate(
    preferences: TripPlanPreferences,
    guestCount: number,
  ): Promise<void> {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const result = await generateTripPlan(plan.id, { preferences, guestCount, locale });
      setPlan(result.plan);
      setQuota(result.quota);
      setEvents(result.plan.progress);
      setViewReady(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(t('quota_reached'));
      } else {
        setError(t('generate_error'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSwap(itemId: string): Promise<void> {
    if (!plan) return;
    setSwappingId(itemId);
    try {
      const result = await swapTripPlanItem(plan.id, itemId);
      setPlan(result.plan);
      setQuota(result.quota);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError(t('quota_reached'));
      else setError(t('swap_error'));
    } finally {
      setSwappingId(null);
    }
  }

  if (loading || !plan) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showTimeline = viewReady && (plan.status === 'READY' || plan.status === 'PLANNED');
  const showGenerating = plan.status === 'GENERATING' || (plan.status === 'READY' && !viewReady);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/trips/planner"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        {t('back_to_history')}
      </Link>
      {!showGenerating ? (
        <h1 className="mb-6 text-2xl font-bold">
          {plan.city} · {plan.checkIn} → {plan.checkOut}
        </h1>
      ) : null}
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {showTimeline ? (
        <TripPlanTimeline
          plan={plan}
          swappingId={swappingId}
          onSwap={(itemId) => void handleSwap(itemId)}
        />
      ) : showGenerating ? (
        <TripPlanGenerating plan={plan} events={events} onView={() => setViewReady(true)} />
      ) : (
        <TripPlanIntake
          stay={plan.stay}
          initialPreferences={plan.preferences}
          initialGuestCount={plan.guestCount ?? undefined}
          quota={quota}
          saving={saving}
          onGenerate={(preferences, guestCount) => void handleGenerate(preferences, guestCount)}
        />
      )}
    </main>
  );
}
