import type { AppliedPromotionSummary, BookingQuoteResult } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { Separator } from '@/components/ui/separator';

interface BookingSummaryProps {
  quote: BookingQuoteResult | null;
  isQuoteLoading: boolean;
  nights: number | null;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function promotionLabel(
  promotion: AppliedPromotionSummary,
  t: ReturnType<typeof useTranslations<'booking'>>,
): string {
  if (promotion.promoCode) {
    return t('promotion_applied_code', { code: promotion.promoCode });
  }
  if (promotion.discountType === 'PERCENT' && promotion.discountPercent !== null) {
    return t('promotion_applied_percent', { percent: promotion.discountPercent });
  }
  return t('promotion_discount');
}

export function BookingSummary({
  quote,
  isQuoteLoading,
  nights,
}: BookingSummaryProps): React.JSX.Element {
  const t = useTranslations('booking');
  if (nights === null || !quote) {
    return <p className="text-center text-sm text-muted-foreground">{t('select_dates_hint')}</p>;
  }
  if (isQuoteLoading) {
    return <p className="text-center text-sm text-muted-foreground">{t('loading_quote')}</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>
          {formatPrice(quote.nightlyRate, quote.currency)} × {t('night', { count: nights })}
        </span>
        <span>{formatPrice(quote.accommodationSubtotal, quote.currency)}</span>
      </div>
      {quote.discountAmount > 0 && quote.appliedPromotion && (
        <div className="flex justify-between text-emerald-600">
          <span>{promotionLabel(quote.appliedPromotion, t)}</span>
          <span>−{formatPrice(quote.discountAmount, quote.currency)}</span>
        </div>
      )}
      {quote.cleaningFee > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cleaning_fee')}</span>
          <span>{formatPrice(quote.cleaningFee, quote.currency)}</span>
        </div>
      )}
      {quote.securityDeposit > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>{t('security_deposit')}</span>
          <span>{formatPrice(quote.securityDeposit, quote.currency)}</span>
        </div>
      )}
      <Separator />
      <div className="flex justify-between font-semibold">
        <span>{t('total')}</span>
        <span>{formatPrice(quote.totalAmount, quote.currency)}</span>
      </div>
    </div>
  );
}
