'use client';

import type { PropertySummary } from '@repo/shared';
import { getLocalizedAddress, getLocalizedTitle, propertyTypeLabelKey } from '@repo/shared';
import { Star } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { usePriceFormatter } from '@/hooks/use-price-formatter';
import { Link } from '@/i18n/navigation';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';

import { FavoriteButton } from './favorite-button';

interface PropertyCardProps {
  property: PropertySummary;
}

export function PropertyCard({ property }: PropertyCardProps): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations('property_card');
  const tc = useTranslations('property_card.categories');
  const { formatAmd } = usePriceFormatter();
  const ratingLabel = property.avgRating !== undefined ? property.avgRating.toFixed(1) : '—';
  const address = getLocalizedAddress(property.addressLabels, locale, {
    city: property.city,
    region: property.region,
    street: null,
    formattedAddress: property.city,
  });
  const localizedTitle = getLocalizedTitle(property.titleLabels, locale, property.title);
  const locationLine = address.region ? `${address.city}, ${address.region}` : (address.city ?? '');
  return (
    <Link href={`/property/${property.id}`} className="group block">
      <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <PropertyCardMedia
          propertyId={property.id}
          imageUrl={property.coverPhotoUrl ?? PROPERTY_PLACEHOLDER_IMAGE}
          title={localizedTitle}
          categoryLabel={tc(propertyTypeLabelKey(property.propertyType))}
        />
        <div className="p-4">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 flex-1 text-sm font-semibold text-foreground">
              {localizedTitle}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
              <span className="text-sm font-medium">{ratingLabel}</span>
            </div>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{locationLine}</p>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground">{formatAmd(property.pricePerNight)}</span>
              <span className="ml-1 text-xs text-muted-foreground">{t('per_night')}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {t('bedrooms', { count: property.bedrooms })} ·{' '}
              {t('guests_max', { count: property.maxGuests })}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('reviews', { count: property.reviewCount })}
          </p>
        </div>
      </article>
    </Link>
  );
}

interface PropertyCardMediaProps {
  propertyId: string;
  imageUrl: string;
  title: string;
  categoryLabel: string;
}

function PropertyCardMedia({
  propertyId,
  imageUrl,
  title,
  categoryLabel,
}: PropertyCardMediaProps): React.JSX.Element {
  return (
    <div className="relative aspect-[4/3] overflow-hidden">
      <Image
        src={imageUrl}
        alt={title}
        fill
        loading="lazy"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-white/90 px-2.5 py-0.5 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur">
        {categoryLabel}
      </span>
      <FavoriteButton propertyId={propertyId} />
    </div>
  );
}
