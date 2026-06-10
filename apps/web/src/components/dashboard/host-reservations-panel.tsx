'use client';

import type { BookingDetail } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { Calendar, House, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { listMyBookings } from '@/lib/api/bookings';
import { formatAmd } from '@/lib/format/price';
import { splitHostReservations } from '@/lib/host-reservations';

type ReservationTab = 'upcoming' | 'past';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ReservationCard({ booking }: { booking: BookingDetail }): React.JSX.Element {
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
        <p className="truncate font-medium">{localizedTitle}</p>
        <p className="text-sm text-muted-foreground">
          {booking.property.city}, {booking.property.country}
        </p>
        <p className="mt-1 text-sm">
          {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
        </p>
        <p className="mt-1 text-sm font-semibold">{formatAmd(booking.totalAmount)}</p>
      </div>
    </Link>
  );
}

export function HostReservationsPanel(): React.JSX.Element {
  const t = useTranslations('dashboard.reservations');
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReservationTab>('upcoming');

  useEffect(() => {
    listMyBookings({ limit: 100 })
      .then((res) => setBookings(res.data))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/auth/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const { upcoming, past } = splitHostReservations(bookings);
  const tabBookings: Record<ReservationTab, BookingDetail[]> = { upcoming, past };
  const tabs: { key: ReservationTab; label: string; count: number }[] = [
    { key: 'upcoming', label: t('tab_upcoming'), count: upcoming.length },
    { key: 'past', label: t('tab_past'), count: past.length },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = tabBookings[activeTab];

  return (
    <div>
      <div className="mb-6 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            data-state={activeTab === tab.key ? 'active' : 'inactive'}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Calendar className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {activeTab === 'upcoming' ? t('empty_upcoming') : t('empty_past')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((booking) => (
            <ReservationCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
