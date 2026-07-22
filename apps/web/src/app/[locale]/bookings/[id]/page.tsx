'use client';

import type { BookingDetail } from '@repo/shared';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BookingConfirmationView } from '@/components/bookings/booking-confirmation-view';
import { useRouter } from '@/i18n/navigation';
import { getBookingById } from '@/lib/api/bookings';
import { useAuthStore } from '@/store';

export default function BookingConfirmationPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBookingById(id)
      .then(setBooking)
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes('401')) {
          router.replace('/auth/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      });
  }, [id, router]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!booking || authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isHostView = Boolean(user && user.id !== booking.guestId);
  return (
    <BookingConfirmationView
      booking={booking}
      variant={isHostView ? 'host' : 'guest'}
      onContinuePayment={() => router.push(`/bookings/${id}/payment`)}
      onCancelled={() => {
        void getBookingById(id).then(setBooking);
      }}
      onDepositChanged={() => {
        void getBookingById(id).then(setBooking);
      }}
    />
  );
}
