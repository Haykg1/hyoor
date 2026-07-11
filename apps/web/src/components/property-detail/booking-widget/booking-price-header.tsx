import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PropertyPriceDisplay } from '@/components/property/property-price-display';

interface BookingPriceHeaderProps {
  pricePerNight: number;
  currency: string;
  displayPrice?: { amount: number; currency: string } | null;
  avgRating: number | null;
  reviewCount: number;
}

export function BookingPriceHeader({
  pricePerNight,
  currency,
  displayPrice,
  avgRating,
  reviewCount,
}: BookingPriceHeaderProps): React.JSX.Element {
  const t = useTranslations('booking');
  return (
    <div className="flex items-start justify-between">
      <PropertyPriceDisplay
        pricePerNight={pricePerNight}
        currency={currency}
        displayPrice={displayPrice}
        mainClassName="text-2xl font-bold"
        suffix={
          <span className="ml-1 text-sm font-normal text-muted-foreground">{t('per_night')}</span>
        }
      />
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
