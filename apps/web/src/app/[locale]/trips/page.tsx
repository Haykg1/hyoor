'use client';

import type { BookingDetail } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { Calendar, CheckCircle2, House, Loader2, Star } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { listMyBookings } from '@/lib/api/bookings';
import { getMyProfile, type MyProfile } from '@/lib/api/users';
import { formatAmd } from '@/lib/format/price';

type BookingTab = 'upcoming' | 'past' | 'cancelled';

const STATUS_UPCOMING = new Set(['CONFIRMED']);
const STATUS_CANCELLED = new Set(['CANCELLED_BY_GUEST', 'CANCELLED_BY_HOST']);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED_BY_GUEST: 'Cancelled',
  CANCELLED_BY_HOST: 'Cancelled by host',
  NO_SHOW: 'No-show',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED_BY_GUEST: 'bg-muted text-muted-foreground',
  CANCELLED_BY_HOST: 'bg-muted text-muted-foreground',
  NO_SHOW: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function BookingCard({ booking }: { booking: BookingDetail }): React.JSX.Element {
  const locale = useLocale();
  const localizedTitle = getLocalizedTitle(
    booking.property.titleLabels,
    locale,
    booking.property.title,
  );
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {booking.property.coverPhotoUrl ? (
          <Image
            src={booking.property.coverPhotoUrl}
            alt={localizedTitle}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <House className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-foreground">{localizedTitle}</p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {booking.property.city}, {booking.property.country}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {booking.nightsCount} nights · {booking.guestCount} guests
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-semibold">{formatAmd(booking.totalAmount)}</p>
      </div>
    </Link>
  );
}

function EmptyState({ tab }: { tab: BookingTab }): React.JSX.Element {
  const t = useTranslations('trips');
  return (
    <div className="flex flex-col items-center py-16 text-muted-foreground text-center">
      <House className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-sm">
        {tab === 'upcoming'
          ? t('empty_upcoming')
          : tab === 'past'
            ? t('empty_past')
            : t('empty_cancelled')}
      </p>
      {tab === 'upcoming' && (
        <Link
          href="/search"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          {t('explore_button')}
        </Link>
      )}
    </div>
  );
}

export default function TripsPage(): React.JSX.Element {
  const t = useTranslations('trips');
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');

  useEffect(() => {
    Promise.all([listMyBookings({ limit: 100 }), getMyProfile()])
      .then(([bookingsRes, profileRes]) => {
        setBookings(bookingsRes.data);
        setProfile(profileRes);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/auth/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const upcoming = bookings.filter((b) => STATUS_UPCOMING.has(b.status));
  const past = bookings.filter((b) => b.status === 'COMPLETED');
  const cancelled = bookings.filter((b) => STATUS_CANCELLED.has(b.status));
  const totalSpent = past.reduce((sum, b) => sum + b.totalAmount, 0);

  const tabBookings: Record<BookingTab, BookingDetail[]> = { upcoming, past, cancelled };

  const displayName = profile?.profile
    ? `${profile.profile.firstName} ${profile.profile.lastName}`
    : (profile?.email ?? '');

  const tabs: { key: BookingTab; label: string; count: number }[] = [
    { key: 'upcoming', label: t('tab_upcoming'), count: upcoming.length },
    { key: 'past', label: t('tab_past'), count: past.length },
    { key: 'cancelled', label: t('tab_cancelled'), count: cancelled.length },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        {displayName && (
          <p className="text-muted-foreground mt-1">{t('welcome', { name: displayName })}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="font-bold text-lg">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">{t('stat_upcoming')}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-2 mx-auto">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-bold text-lg">{past.length}</p>
          <p className="text-xs text-muted-foreground">{t('stat_past')}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <div className="h-9 w-9 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 flex items-center justify-center mb-2 mx-auto">
            <Star className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="font-bold text-lg">{formatAmd(totalSpent)}</p>
          <p className="text-xs text-muted-foreground">{t('stat_spent')}</p>
        </div>
      </div>

      <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground mb-6">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeTab === key ? 'bg-background text-foreground shadow' : 'hover:text-foreground'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tabBookings[activeTab].length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          tabBookings[activeTab].map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))
        )}
      </div>
    </main>
  );
}
