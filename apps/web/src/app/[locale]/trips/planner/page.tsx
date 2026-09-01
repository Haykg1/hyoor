'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { TripPlannerHome } from '@/components/trip-planner/trip-planner-home';
import { Link } from '@/i18n/navigation';

function TripPlannerPageInner(): React.JSX.Element {
  const t = useTranslations('trip_planner');
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') ?? undefined;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/trips"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        {t('back_to_trips')}
      </Link>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">{t('title')}</h1>
      <TripPlannerHome bookingId={bookingId} />
    </main>
  );
}

export default function TripPlannerPage(): React.JSX.Element {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl px-4 py-10 sm:px-6" />}>
      <TripPlannerPageInner />
    </Suspense>
  );
}
