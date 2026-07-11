'use client';

import type { BookingDetail } from '@repo/shared';
import { getLocalizedTitle, PaymentProviders } from '@repo/shared';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ApiError } from '@/lib/api';
import { confirmStripePayment, createStripeSetupIntent, getBookingById } from '@/lib/api/bookings';
import { getStripe } from '@/lib/stripe';

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

interface StripeCheckoutFormProps {
  bookingId: string;
  onSuccess: () => void;
}

function StripeCheckoutForm({ bookingId, onSuccess }: StripeCheckoutFormProps): React.JSX.Element {
  const t = useTranslations('payment');
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    try {
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });
      if (setupError || !setupIntent) {
        toast.error(setupError?.message ?? t('error_generic'));
        return;
      }
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;
      if (!paymentMethodId) {
        toast.error(t('error_generic'));
        return;
      }
      let result = await confirmStripePayment(bookingId, paymentMethodId);
      if (result.status === 'REQUIRES_ACTION' && result.clientSecret) {
        const { error: actionError } = await stripe.confirmCardPayment(result.clientSecret);
        if (actionError) {
          toast.error(actionError.message ?? t('error_generic'));
          return;
        }
        result = await confirmStripePayment(bookingId, paymentMethodId);
      }
      if (result.status === 'CONFIRMED') {
        onSuccess();
        return;
      }
      toast.error(t('error_generic'));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t('error_generic'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ wallets: { link: 'never' } }} />
      <Button type="submit" className="w-full" disabled={!stripe || isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('paying')}
          </>
        ) : (
          t('pay_button')
        )}
      </Button>
    </form>
  );
}

export default function BookingPaymentPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('payment');
  const tBooking = useTranslations('booking');
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripePromise = useMemo(() => getStripe(), []);
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

  useEffect(() => {
    if (!booking || remainingMs === 0) return;
    createStripeSetupIntent(booking.id)
      .then((res) => setClientSecret(res.clientSecret))
      .catch(() => setError(t('error_generic')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  const handleSuccess = (): void => {
    toast.success(t('success_toast'));
    router.push(`/${locale}/bookings/${id}`);
  };

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t('method_label')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {PaymentProviders.map((provider) => {
              const isStripe = provider === 'STRIPE';
              return (
                <div
                  key={provider}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                    isStripe
                      ? 'border-primary bg-primary/5'
                      : 'border-border text-muted-foreground opacity-60'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t(`method.${provider}`)}
                  </span>
                  {!isStripe && <span className="text-xs">{t('coming_soon')}</span>}
                </div>
              );
            })}
          </div>

          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeCheckoutForm bookingId={booking.id} onSuccess={handleSuccess} />
            </Elements>
          ) : (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
