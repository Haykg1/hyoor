'use client';

import { MAX_DEPOSIT_CLAIM_PHOTOS } from '@repo/shared/constants';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { submitDepositClaim, uploadDepositClaimPhoto } from '@/lib/api/deposit-claims';
import { formatStoredMoney } from '@/lib/format/money';

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MIN_REASON_LENGTH = 10;

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

interface DepositClaimDialogProps {
  bookingId: string;
  depositAmount: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

export function DepositClaimDialog({
  bookingId,
  depositAmount,
  currency,
  open,
  onOpenChange,
  onSubmitted,
}: DepositClaimDialogProps): React.JSX.Element {
  const t = useTranslations('booking.deposit_claim_dialog');
  const [amount, setAmount] = useState(depositAmount);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setAmount(depositAmount);
    setReason('');
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }, [open, depositAmount]);
  const amountValid = amount > 0 && amount <= depositAmount;
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_DEPOSIT_CLAIM_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...toAdd]);
    e.target.value = '';
  }
  function removePhoto(index: number): void {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index]!.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }
  async function handleSubmit(): Promise<void> {
    if (!amountValid || !reasonValid) return;
    setSubmitting(true);
    try {
      const evidenceKeys = await Promise.all(
        photos.map((p) => uploadDepositClaimPhoto(bookingId, p.file)),
      );
      await submitDepositClaim(bookingId, { amount, reason: reason.trim(), evidenceKeys });
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      toast.success(t('success'));
      onOpenChange(false);
      onSubmitted();
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
        <div className="space-y-4 text-sm">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t('admin_review_note')}
          </p>
          <div className="space-y-2">
            <Label htmlFor="claim-amount">{t('amount_label')}</Label>
            <MoneyInput
              id="claim-amount"
              value={amount}
              onValueChange={setAmount}
              currency={currency}
              disabled={submitting}
            />
            {!amountValid && amount > 0 ? (
              <p className="text-xs text-destructive">
                {t('amount_too_high', { max: formatStoredMoney(depositAmount, currency) })}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-reason">{t('reason_label')}</Label>
            <Textarea
              id="claim-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reason_placeholder')}
              rows={4}
              maxLength={2000}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('photos_label')}</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    aria-label={t('remove_photo')}
                    disabled={submitting}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_DEPOSIT_CLAIM_PHOTOS ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  aria-label={t('add_photo')}
                  disabled={submitting}
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('photos_hint', { max: MAX_DEPOSIT_CLAIM_PHOTOS })}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
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
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !amountValid || !reasonValid}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('submitting')}
              </span>
            ) : (
              t('confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
