'use client';

import type { BookingDetail } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { Calendar, House, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { listMyBookings } from '@/lib/api/bookings';
import { isBookingCancellable, toCancelBookingPreview } from '@/lib/bookings/cancellation';
import {
  guestDisplayName,
  resolveHostPayoutAmount,
  resolvePlatformFeeAmount,
} from '@/lib/bookings/host-money';
import { formatBookingDate } from '@/lib/format/booking-date';
import { splitHostReservations } from '@/lib/host-reservations';

type ReservationTab = 'upcoming' | 'past';

function ReservationCard({
  booking,
  onCancelled,
}: {
  booking: BookingDetail;
  onCancelled: () => void;
}): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations('dashboard.reservations');
  const tBooking = useTranslations('booking');
  const tConfirm = useTranslations('booking.confirmation');
  const { formatMoney } = useDisplayMoney();
  const [cancelOpen, setCancelOpen] = useState(false);
  const localizedTitle = getLocalizedTitle(
    booking.property.titleLabels,
    locale,
    booking.property.title,
  );
  const guestName = guestDisplayName(booking.guest) ?? tConfirm('guest_fallback');
  const hostPayout = resolveHostPayoutAmount(booking);
  const platformFee = resolvePlatformFeeAmount(booking);
  const cancelPreview = toCancelBookingPreview(booking);
  const showCancel = isBookingCancellable(booking);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <Link href={`/bookings/${booking.id}`} className="flex gap-4">
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
            <p className="truncate font-medium">{localizedTitle}</p>
            <StatusBadge status={booking.status} namespace="booking" />
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.property.city}, {booking.property.country}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('guest_label')}: <span className="text-foreground">{guestName}</span>
          </p>
          <p className="mt-1 text-sm">
            {formatBookingDate(booking.checkIn)} – {formatBookingDate(booking.checkOut)}
          </p>
          <div className="mt-2 space-y-0.5 text-sm">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              {t('your_payout')}: {formatMoney(hostPayout, booking.currency)}
            </p>
            <p className="text-muted-foreground">
              {t('platform_fee')}: {formatMoney(platformFee, booking.currency)}
            </p>
            <p className="text-muted-foreground">
              {t('guest_paid')}: {formatMoney(booking.totalAmount, booking.currency)}
            </p>
          </div>
        </div>
      </Link>
      {showCancel ? (
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <Button type="button" size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
            {tBooking('cancel')}
          </Button>
        </div>
      ) : null}
      <CancelBookingDialog
        booking={cancelPreview}
        role="host"
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={onCancelled}
      />
    </div>
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
            <ReservationCard
              key={booking.id}
              booking={booking}
              onCancelled={() => {
                void listMyBookings({ limit: 100 }).then((res) => setBookings(res.data));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
