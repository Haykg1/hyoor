'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api';
import { releaseDeposit } from '@/lib/api/deposit-claims';
import { formatStoredMoney } from '@/lib/format/money';

interface ReleaseDepositDialogProps {
  bookingId: string;
  depositAmount: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReleased: () => void;
}

export function ReleaseDepositDialog({
  bookingId,
  depositAmount,
  currency,
  open,
  onOpenChange,
  onReleased,
}: ReleaseDepositDialogProps): React.JSX.Element {
  const t = useTranslations('booking.deposit_release_dialog');
  const [submitting, setSubmitting] = useState(false);
  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    try {
      await releaseDeposit(bookingId);
      toast.success(t('success'));
      onOpenChange(false);
      onReleased();
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
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { amount: formatStoredMoney(depositAmount, currency) })}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {t('warning')}
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={submitting}>
            {submitting ? t('submitting') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
