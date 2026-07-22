'use client';

import type { AdminBooking } from '@repo/shared';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from '@/i18n/navigation';
import { isBookingCancellable, type CancelBookingPreview } from '@/lib/bookings/cancellation';
import { formatCurrencyAmount } from '@/lib/format/price';

interface AdminBookingsTableProps {
  bookings: AdminBooking[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  actionId: string | null;
  canRetryMoney: boolean;
  onPageChange: (page: number) => void;
  onRetryRentCapture: (id: string) => Promise<void>;
  onRetryPayout: (id: string) => Promise<void>;
  onCancelled?: () => void;
}

function toAdminCancelPreview(booking: AdminBooking): CancelBookingPreview {
  return {
    id: booking.id,
    status: booking.status,
    checkIn: booking.checkIn,
    totalAmount: booking.totalAmount,
    securityDeposit: booking.securityDeposit,
    currency: booking.currency,
    cancellationPolicy: booking.cancellationPolicy,
    cancellationFeeType: booking.cancellationFeeType,
    cancellationFeeValue: booking.cancellationFeeValue,
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function CopyBookingIdButton({ bookingId }: { bookingId: string }): React.JSX.Element {
  const t = useTranslations('admin.bookings');
  const [copied, setCopied] = useState(false);
  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(bookingId);
      setCopied(true);
      toast.success(t('copy_id_success'));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copy_id_error'));
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 font-normal"
      onClick={() => void handleCopy()}
      aria-label={t('copy_id')}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="text-xs">{t('copy_id')}</span>
    </Button>
  );
}

export function AdminBookingsTable({
  bookings,
  isLoading,
  page,
  totalPages,
  total,
  actionId,
  canRetryMoney,
  onPageChange,
  onRetryRentCapture,
  onRetryPayout,
  onCancelled,
}: AdminBookingsTableProps): React.JSX.Element {
  const t = useTranslations('admin.bookings');
  const tBooking = useTranslations('booking');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null);
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty_state')}</p>;
  }
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>{t('table.check_in')}</TableHead>
            <TableHead>{t('table.property')}</TableHead>
            <TableHead>{t('table.guest')}</TableHead>
            <TableHead>{t('table.host')}</TableHead>
            <TableHead>{t('table.status')}</TableHead>
            <TableHead>{t('table.payment')}</TableHead>
            <TableHead>{t('table.payout')}</TableHead>
            <TableHead className="text-right">{t('table.total')}</TableHead>
            <TableHead>{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const expanded = expandedId === booking.id;
            const busy = actionId === booking.id;
            return (
              <>
                <TableRow key={booking.id}>
                  <TableCell>
                    {booking.nightlyBreakdown.length > 1 ? (
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setExpandedId(expanded ? null : booking.id)}
                        aria-label={t('table.toggle_nights')}
                      >
                        {expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatDate(booking.checkIn)}
                    <div className="text-xs text-muted-foreground">
                      {t('table.nights', { count: booking.nightsCount })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/property/${booking.propertyId}`}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {booking.propertyTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{booking.guestName}</TableCell>
                  <TableCell className="text-sm">{booking.hostName}</TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} namespace="booking" />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {booking.paymentStatus}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {booking.payoutStatus}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrencyAmount(booking.totalAmount, booking.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <CopyBookingIdButton bookingId={booking.id} />
                      {canRetryMoney && booking.canRetryRentCapture ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void onRetryRentCapture(booking.id)}
                        >
                          {busy ? t('retrying') : t('retry_capture')}
                        </Button>
                      ) : null}
                      {canRetryMoney && booking.canRetryPayout ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void onRetryPayout(booking.id)}
                        >
                          {busy ? t('retrying') : t('retry_payout')}
                        </Button>
                      ) : null}
                      {isBookingCancellable(booking) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setCancelTarget(booking)}
                        >
                          {tBooking('cancel')}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
                {expanded ? (
                  <TableRow key={`${booking.id}-nights`}>
                    <TableCell colSpan={10} className="bg-muted/40">
                      <div className="px-2 py-2">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          {t('table.nightly_breakdown')}
                        </p>
                        <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {booking.nightlyBreakdown.map((night) => (
                            <li
                              key={`${booking.id}-${night.date}`}
                              className="flex justify-between gap-3 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
                            >
                              <span>{formatDate(night.date)}</span>
                              <span className="font-medium tabular-nums">
                                {formatCurrencyAmount(night.amount, booking.currency)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('pagination.page_of', { page, totalPages, total })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {cancelTarget ? (
        <CancelBookingDialog
          booking={toAdminCancelPreview(cancelTarget)}
          role="admin"
          open
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
          onCancelled={() => {
            setCancelTarget(null);
            onCancelled?.();
          }}
        />
      ) : null}
    </div>
  );
}
