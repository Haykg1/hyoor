'use client';

import type { PropertyDetail } from '@repo/shared';
import { getLocalizedAddress, getLocalizedTitle, propertyTypeLabelKey } from '@repo/shared';
import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

interface PropertyDetailHeaderProps {
  property: Pick<
    PropertyDetail,
    | 'title'
    | 'titleLabels'
    | 'propertyType'
    | 'city'
    | 'region'
    | 'country'
    | 'addressLine'
    | 'formattedAddress'
    | 'street'
    | 'addressLabels'
    | 'avgRating'
    | 'reviewCount'
  >;
}

export function PropertyDetailHeader({ property }: PropertyDetailHeaderProps): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations('property_card.categories');
  const address = getLocalizedAddress(property.addressLabels, locale, {
    city: property.city,
    region: property.region,
    street: property.street,
    formattedAddress: property.formattedAddress ?? property.addressLine ?? property.city,
  });
  const localizedTitle = getLocalizedTitle(property.titleLabels, locale, property.title);
  const locationLine = [address.formattedAddress, property.country].filter(Boolean).join(', ');
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link href="/search" className="mr-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Badge variant="secondary" className="text-xs">
          {t(propertyTypeLabelKey(property.propertyType))}
        </Badge>
      </div>
      <h1 className="text-2xl font-bold leading-tight md:text-3xl">{localizedTitle}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {(property.avgRating ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-foreground">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{property.avgRating!.toFixed(1)}</span>
            <span className="text-muted-foreground">({property.reviewCount})</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {locationLine}
        </span>
      </div>
    </div>
  );
}
