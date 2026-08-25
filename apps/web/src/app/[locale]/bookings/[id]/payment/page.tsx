'use client';

import type { BookingDetail } from '@repo/shared';
import { getLocalizedTitle, PaymentProviders } from '@repo/shared';
import { CreditCard, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { CancellationPolicyNotice } from '@/components/bookings/cancellation-policy-notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getBookingById } from '@/lib/api/bookings';
import { formatStoredMoney as formatPrice } from '@/lib/format/money';

function useCountdown(deadline: string | null): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setRemainingMs(null);
      return;
    }
    const target = new Date(deadline).getTime();
    const tick = (): void => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remainingMs;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function BookingPaymentPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('payment');
  const tBooking = useTranslations('booking');
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const remainingMs = useCountdown(booking?.paymentLockExpiresAt ?? null);

  useEffect(() => {
    getBookingById(id)
      .then((data) => {
        if (data.status !== 'AWAITING_PAYMENT') {
          router.replace(`/${locale}/bookings/${id}`);
          return;
        }
        setBooking(data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes('401')) {
          router.replace(`/${locale}/auth/login`);
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      });
  }, [id, router, locale]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (remainingMs === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">{t('expired_title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('expired_description')}</p>
        <Button className="mt-6" onClick={() => router.push(`/${locale}`)}>
          {t('back_home')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
        {remainingMs !== null && (
          <p className="mt-3 text-sm font-medium text-amber-600">
            {t('time_remaining', { time: formatCountdown(remainingMs) })}
          </p>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            {getLocalizedTitle(booking.property.titleLabels, locale, booking.property.title)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tBooking('check_in')}</span>
            <span>{booking.checkIn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tBooking('check_out')}</span>
            <span>{booking.checkOut}</span>
          </div>
          {booking.securityDeposit > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>{tBooking('security_deposit')}</span>
              <span>{formatPrice(booking.securityDeposit, booking.currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>{t('total_due')}</span>
            <span>{formatPrice(booking.totalAmount, booking.currency)}</span>
          </div>
          <CancellationPolicyNotice
            cancellationPolicy={booking.property.cancellationPolicy}
            cancellationFeeType={booking.property.cancellationFeeType}
            cancellationFeeValue={booking.property.cancellationFeeValue}
            cancellationDeadlineDays={booking.property.cancellationDeadlineDays}
            currency={booking.currency}
            checkIn={booking.checkIn}
            audience="guest"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t('method_label')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {PaymentProviders.map((provider) => (
              <div
                key={provider}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground opacity-60"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t(`method.${provider}`)}
                </span>
                <span className="text-xs">{t('coming_soon')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
