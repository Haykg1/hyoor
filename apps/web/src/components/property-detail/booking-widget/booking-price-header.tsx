import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BookingPriceHeaderProps {
  pricePerNight: number;
  currency: string;
  avgRating: number | null;
  reviewCount: number;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function BookingPriceHeader({
  pricePerNight,
  currency,
  avgRating,
  reviewCount,
}: BookingPriceHeaderProps): React.JSX.Element {
  const t = useTranslations('booking');
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{formatPrice(pricePerNight, currency)}</span>
        <span className="text-sm text-muted-foreground">{t('per_night')}</span>
      </div>
      {(avgRating ?? 0) > 0 && (
        <div className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">{avgRating!.toFixed(1)}</span>
          <span className="text-muted-foreground">({reviewCount})</span>
        </div>
      )}
    </div>
  );
}
