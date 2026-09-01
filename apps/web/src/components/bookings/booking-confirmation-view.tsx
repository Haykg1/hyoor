'use client';

import type { BookingDetail } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { ArrowLeft, CheckCircle2, UserRound, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog';
import { CancellationPolicyNotice } from '@/components/bookings/cancellation-policy-notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { Link } from '@/i18n/navigation';
import {
  canGuestCancelBooking,
  isBookingCancellable,
  toCancelBookingPreview,
} from '@/lib/bookings/cancellation';
import {
  guestDisplayName,
  resolveHostPayoutAmount,
  resolvePlatformFeeAmount,
} from '@/lib/bookings/host-money';
import { formatBookingDate } from '@/lib/format/booking-date';
import { formatStoredMoney } from '@/lib/format/money';

const PAYABLE_STATUS = 'AWAITING_PAYMENT';
const CANCELLED_STATUSES = new Set(['CANCELLED_BY_GUEST', 'CANCELLED_BY_HOST']);
const PLAN_STATUSES = new Set(['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED']);

/** Rent kept by the host on cancellation; only meaningful after a fee was captured. */
function resolveCancellationFee(booking: BookingDetail): number {
  if (!CANCELLED_STATUSES.has(booking.status)) return 0;
  const feeWasCharged =
    booking.paymentStatus === 'PARTIALLY_REFUNDED' || booking.refundedAmount > 0;
  if (!feeWasCharged) return 0;
  const rent = Math.max(0, booking.totalAmount - booking.securityDeposit);
  return Math.max(0, rent - booking.refundedAmount);
}

interface BookingConfirmationViewProps {
  booking: BookingDetail;
  variant: 'guest' | 'host';
  onContinuePayment?: () => void;
  onCancelled?: () => void;
}

function MoneyRow({
  label,
  value,
  emphasize,
  muted,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  muted?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={`flex justify-between gap-4 ${emphasize ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}
    >
      <span className={emphasize ? undefined : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function BookingConfirmationView({
  booking,
  variant,
  onContinuePayment,
  onCancelled,
}: BookingConfirmationViewProps): React.JSX.Element {
  const t = useTranslations('booking.confirmation');
  const tBooking = useTranslations('booking');
  const tPlanner = useTranslations('trip_planner');
  const tPolicy = useTranslations('booking.cancellation_policy');
  const locale = useLocale();
  const { formatMoney } = useDisplayMoney();
  const [cancelOpen, setCancelOpen] = useState(false);
  const isHost = variant === 'host';
  const money = (amount: number) =>
    isHost ? formatMoney(amount, booking.currency) : formatStoredMoney(amount, booking.currency);
  const hostPayout = resolveHostPayoutAmount(booking);
  const platformFee = resolvePlatformFeeAmount(booking);
  const guestName = guestDisplayName(booking.guest) ?? t('guest_fallback');
  const propertyTitle = getLocalizedTitle(
    booking.property.titleLabels,
    locale,
    booking.property.title,
  );
  const cancelPreview = toCancelBookingPreview(booking);
  const showCancel = isHost ? isBookingCancellable(booking) : canGuestCancelBooking(cancelPreview);
  const isCancelled = CANCELLED_STATUSES.has(booking.status);
  const cancellationFee = resolveCancellationFee(booking);
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      {isHost ? (
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back_to_dashboard')}
        </Link>
      ) : null}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        {isCancelled ? (
          <XCircle className="h-16 w-16 text-destructive" />
        ) : (
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        )}
        <h1 className="text-2xl font-bold">
          {isCancelled ? t('cancelled_title') : isHost ? t('host_title') : t('title')}
        </h1>
        <p className="text-muted-foreground">
          {isCancelled ? t('cancelled_subtitle') : isHost ? t('host_subtitle') : t('subtitle')}
        </p>
        {!isHost && isCancelled ? (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              cancellationFee > 0
                ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100'
                : 'border-border bg-muted/40 text-muted-foreground'
            }`}
          >
            {cancellationFee > 0
              ? tPolicy('fee_charged', { amount: money(cancellationFee) })
              : tPolicy('fee_none')}
          </p>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{propertyTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {booking.property.city}, {booking.property.country}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isHost ? (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
                <UserRound className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('guest_label')}
                </p>
                <p className="truncate font-medium">{guestName}</p>
                {booking.guest.email ? (
                  <p className="truncate text-muted-foreground">{booking.guest.email}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <MoneyRow
            label={tBooking('check_in')}
            value={formatBookingDate(booking.checkIn, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          />
          <MoneyRow
            label={tBooking('check_out')}
            value={formatBookingDate(booking.checkOut, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          />
          <MoneyRow label={tBooking('guests')} value={String(booking.guestCount)} />
          <MoneyRow
            label={t('nights_label')}
            value={tBooking('night', { count: booking.nightsCount })}
          />
          <MoneyRow label={t('nightly_rate')} value={money(booking.nightlyRate)} />
          {booking.discountAmount > 0 ? (
            <MoneyRow
              label={tBooking('promotion_discount')}
              value={`−${money(booking.discountAmount)}`}
            />
          ) : null}
          {booking.cleaningFee > 0 ? (
            <MoneyRow label={tBooking('cleaning_fee')} value={money(booking.cleaningFee)} />
          ) : null}
          {booking.securityDeposit > 0 ? (
            <MoneyRow label={tBooking('security_deposit')} value={money(booking.securityDeposit)} />
          ) : null}
          {booking.specialRequests ? (
            <div className="space-y-1">
              <p className="text-muted-foreground">{tBooking('special_requests')}</p>
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-foreground">
                {booking.specialRequests}
              </p>
            </div>
          ) : null}
          <Separator />
          {isHost ? (
            <>
              <MoneyRow label={t('guest_paid')} value={money(booking.totalAmount)} />
              <MoneyRow label={t('platform_fee')} value={money(platformFee)} muted />
              <MoneyRow label={t('your_payout')} value={money(hostPayout)} emphasize />
              {cancellationFee > 0 ? (
                <MoneyRow label={t('cancellation_fee')} value={money(cancellationFee)} />
              ) : null}
              {booking.refundedAmount > 0 ? (
                <MoneyRow label={t('refunded')} value={money(booking.refundedAmount)} muted />
              ) : null}
              <div className="flex justify-between gap-4 pt-1">
                <span className="text-muted-foreground">{t('payment_status')}</span>
                <span className="text-right font-medium">
                  {t(`payment_status_values.${booking.paymentStatus}`)}
                </span>
              </div>
            </>
          ) : (
            <>
              <MoneyRow label={tBooking('total')} value={money(booking.totalAmount)} emphasize />
              {cancellationFee > 0 ? (
                <MoneyRow label={t('cancellation_fee')} value={money(cancellationFee)} />
              ) : null}
              {isCancelled && booking.refundedAmount > 0 ? (
                <MoneyRow label={t('refunded')} value={money(booking.refundedAmount)} />
              ) : null}
            </>
          )}
          {!isCancelled ? (
            <CancellationPolicyNotice
              cancellationPolicy={booking.property.cancellationPolicy}
              cancellationFeeType={booking.property.cancellationFeeType}
              cancellationFeeValue={booking.property.cancellationFeeValue}
              cancellationDeadlineDays={booking.property.cancellationDeadlineDays}
              currency={booking.currency}
              checkIn={isHost ? undefined : booking.checkIn}
              audience={isHost ? 'listing' : 'guest'}
            />
          ) : null}
        </CardContent>
      </Card>
      <div className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        {t('booking_status')} <StatusBadge status={booking.status} namespace="booking" />
      </div>
      {!isHost && PLAN_STATUSES.has(booking.status) ? (
        <Button className="mt-6 w-full" variant="secondary" asChild>
          <Link href={`/trips/planner?bookingId=${booking.id}`}>{tPlanner('plan_this_trip')}</Link>
        </Button>
      ) : null}
      {!isHost && booking.status === PAYABLE_STATUS && onContinuePayment ? (
        <Button className="mt-6 w-full" onClick={onContinuePayment}>
          {t('continue_payment')}
        </Button>
      ) : null}
      {showCancel ? (
        <Button className="mt-3 w-full" variant="outline" onClick={() => setCancelOpen(true)}>
          {tBooking('cancel')}
        </Button>
      ) : null}
      <CancelBookingDialog
        booking={cancelPreview}
        role={isHost ? 'host' : 'guest'}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => onCancelled?.()}
      />
    </div>
  );
}
