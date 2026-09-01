'use client';

import type { TripPlanPreferences, TripPlanStaySnapshot, TripPlannerQuotaView } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

import { TripPlanIntake } from '@/components/trip-planner/trip-plan-intake';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { getBookingById } from '@/lib/api/bookings';
import { createTripPlan, getTripPlannerQuota } from '@/lib/api/trip-planner';

function NewTripPlanInner(): React.JSX.Element {
  const t = useTranslations('trip_planner');
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get('bookingId') ?? undefined;
  const city = params.get('city') ?? undefined;
  const region = params.get('region') ?? undefined;
  const checkIn = params.get('checkIn') ?? undefined;
  const checkOut = params.get('checkOut') ?? undefined;

  const [stay, setStay] = useState<TripPlanStaySnapshot | null>(null);
  const [quota, setQuota] = useState<TripPlannerQuotaView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      const [quotaView, booking] = await Promise.all([
        getTripPlannerQuota(),
        bookingId ? getBookingById(bookingId) : Promise.resolve(null),
      ]);
      setQuota(quotaView);
      if (booking) {
        setStay({
          propertyId: booking.property.id,
          title: getLocalizedTitle(booking.property.titleLabels, locale, booking.property.title),
          city: booking.property.city,
          country: booking.property.country,
          coverPhotoUrl: booking.property.coverPhotoUrl,
          nightlyMinor: booking.nightlyRate,
          currency: booking.currency,
          guestCount: booking.guestCount,
          latitude: null,
          longitude: null,
        });
      } else if (!city || !checkIn || !checkOut) {
        router.replace('/trips/planner');
      }
    }
    void load()
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/auth/login?next=/trips/planner');
          return;
        }
        router.replace('/trips/planner');
      })
      .finally(() => setLoading(false));
  }, [bookingId, city, checkIn, checkOut, locale, router]);

  async function handleGenerate(
    preferences: TripPlanPreferences,
    guestCount: number,
  ): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const result = await createTripPlan({
        bookingId,
        city,
        region,
        checkIn,
        checkOut,
        guestCount,
        preferences,
        locale,
      });
      router.replace(`/trips/planner/${result.plan.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError(t('quota_reached'));
      else setError(t('generate_error'));
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/trips/planner"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        {t('back_to_history')}
      </Link>
      <h1 className="mb-2 text-2xl font-bold">{t('title')}</h1>
      {city && !stay ? (
        <p className="mb-6 text-sm text-muted-foreground">
          {city} · {checkIn} → {checkOut}
        </p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <TripPlanIntake
        stay={stay}
        initialGuestCount={stay?.guestCount}
        quota={quota}
        saving={saving}
        onGenerate={(preferences, guestCount) => void handleGenerate(preferences, guestCount)}
      />
    </main>
  );
}

export default function NewTripPlanPage(): React.JSX.Element {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl px-4 py-10 sm:px-6" />}>
      <NewTripPlanInner />
    </Suspense>
  );
}
