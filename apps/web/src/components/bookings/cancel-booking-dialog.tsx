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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { cancelBooking } from '@/lib/api/bookings';
import {
  cancellationFeePreview,
  canGuestCancelBooking,
  type CancelBookingPreview,
} from '@/lib/bookings/cancellation';
import { formatStoredMoney } from '@/lib/format/money';

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
  const [applyFee, setApplyFee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isGuest = role === 'guest';
  const hasConfiguredFee = booking.cancellationFeeValue > 0;
  const preview = cancellationFeePreview(booking, isGuest ? true : applyFee);
  const money = (amount: number) => formatStoredMoney(amount, booking.currency);

  async function handleConfirm(): Promise<void> {
    if (isGuest && !canGuestCancelBooking(booking)) {
      toast.error(t('guest_not_allowed'));
      return;
    }
    setSubmitting(true);
    try {
      await cancelBooking(booking.id, {
        reason: reason.trim() || undefined,
        applyCancellationFee: isGuest ? undefined : applyFee,
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
            currency={booking.currency}
          />
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t('rent')}</span>
              <span className="tabular-nums font-medium">{money(preview.rent)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t('fee')}</span>
              <span className="tabular-nums font-medium">{money(preview.fee)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t('refund')}</span>
              <span className="tabular-nums font-semibold">{money(preview.refund)}</span>
            </div>
            {booking.securityDeposit > 0 ? (
              <p className="pt-1 text-xs text-muted-foreground">{t('deposit_note')}</p>
            ) : null}
          </div>
          {!isGuest && hasConfiguredFee ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="apply-cancel-fee">{t('apply_fee_label')}</Label>
                <p className="text-xs text-muted-foreground">{t('apply_fee_hint')}</p>
              </div>
              <Switch
                id="apply-cancel-fee"
                checked={applyFee}
                onCheckedChange={setApplyFee}
                disabled={submitting}
              />
            </div>
          ) : null}
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
