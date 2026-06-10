'use client';

import type { BookingQuoteResult, PropertyTitleLabels } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyTitle: string;
  propertyTitleLabels: PropertyTitleLabels | null | undefined;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  quote: BookingQuoteResult | null;
  isSubmitting: boolean;
  onConfirm: () => void;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function BookingConfirmDialog({
  open,
  onOpenChange,
  propertyTitle,
  propertyTitleLabels,
  checkIn,
  checkOut,
  guests,
  nights,
  quote,
  isSubmitting,
  onConfirm,
}: BookingConfirmDialogProps): React.JSX.Element {
  const t = useTranslations('booking.confirm_dialog');
  const tBooking = useTranslations('booking');
  const locale = useLocale();
  const title = getLocalizedTitle(propertyTitleLabels, locale, propertyTitle);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="font-medium">{title}</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tBooking('check_in')}</span>
            <span>{formatDate(checkIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tBooking('check_out')}</span>
            <span>{formatDate(checkOut)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tBooking('guests')}</span>
            <span>{guests}</span>
          </div>
          {quote && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span>
                  {formatPrice(quote.nightlyRate, quote.currency)} ×{' '}
                  {tBooking('night', { count: nights })}
                </span>
                <span>{formatPrice(quote.accommodationSubtotal, quote.currency)}</span>
              </div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{tBooking('promotion_discount')}</span>
                  <span>−{formatPrice(quote.discountAmount, quote.currency)}</span>
                </div>
              )}
              {quote.cleaningFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{tBooking('cleaning_fee')}</span>
                  <span>{formatPrice(quote.cleaningFee, quote.currency)}</span>
                </div>
              )}
              {quote.securityDeposit > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{tBooking('security_deposit')}</span>
                  <span>{formatPrice(quote.securityDeposit, quote.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{tBooking('total')}</span>
                <span>{formatPrice(quote.totalAmount, quote.currency)}</span>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting || !quote}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tBooking('submitting')}
              </>
            ) : (
              t('confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
