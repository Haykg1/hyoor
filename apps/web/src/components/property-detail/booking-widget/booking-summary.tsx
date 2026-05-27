import { useTranslations } from 'next-intl';

import { Separator } from '@/components/ui/separator';

interface BookingSummaryProps {
  pricePerNight: number;
  currency: string;
  nights: number | null;
  subtotal: number | null;
  cleaningFee: number | null;
  total: number | null;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function BookingSummary({
  pricePerNight,
  currency,
  nights,
  subtotal,
  cleaningFee,
  total,
}: BookingSummaryProps): React.JSX.Element {
  const t = useTranslations('booking');
  if (subtotal === null || nights === null) {
    return <p className="text-center text-sm text-muted-foreground">{t('select_dates_hint')}</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>
          {formatPrice(pricePerNight, currency)} × {t('night', { count: nights })}
        </span>
        <span>{formatPrice(subtotal, currency)}</span>
      </div>
      {(cleaningFee ?? 0) > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cleaning_fee')}</span>
          <span>{formatPrice(cleaningFee!, currency)}</span>
        </div>
      )}
      <Separator />
      <div className="flex justify-between font-semibold">
        <span>{t('total')}</span>
        <span>{formatPrice(total!, currency)}</span>
      </div>
    </div>
  );
}
