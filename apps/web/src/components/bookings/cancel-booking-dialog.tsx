'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { CancellationPolicyNotice } from '@/components/bookings/cancellation-policy-notice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { cancelBooking } from '@/lib/api/bookings';
import { canGuestCancelBooking, type CancelBookingPreview } from '@/lib/bookings/cancellation';

interface CancelBookingDialogProps {
  booking: CancelBookingPreview;
  role: 'guest' | 'host' | 'admin';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export function CancelBookingDialog({
  booking,
  role,
  open,
  onOpenChange,
  onCancelled,
}: CancelBookingDialogProps): React.JSX.Element {
  const t = useTranslations('booking.cancel_dialog');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isGuest = role === 'guest';

  async function handleConfirm(): Promise<void> {
    if (isGuest && !canGuestCancelBooking(booking)) {
      toast.error(t('guest_not_allowed'));
      return;
    }
    setSubmitting(true);
    try {
      await cancelBooking(booking.id, {
        reason: reason.trim() || undefined,
      });
      toast.success(t('success'));
      onOpenChange(false);
      onCancelled();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : t('error');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isGuest ? t('guest_title') : t('host_title')}</DialogTitle>
          <DialogDescription>
            {isGuest ? t('guest_description') : t('host_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {!isGuest ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              {t('host_warning')}
            </p>
          ) : null}
          <CancellationPolicyNotice
            cancellationPolicy={booking.cancellationPolicy}
            cancellationFeeType={booking.cancellationFeeType}
            cancellationFeeValue={booking.cancellationFeeValue}
            cancellationDeadlineDays={booking.cancellationDeadlineDays}
            currency={booking.currency}
            checkIn={isGuest ? booking.checkIn : undefined}
            audience={isGuest ? 'guest' : 'listing'}
          />
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{t('reason_label')}</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reason_placeholder')}
              rows={3}
              disabled={submitting}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('keep')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={submitting}
          >
            {submitting ? t('submitting') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
