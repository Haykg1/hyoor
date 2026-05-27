'use client';

import type { PropertySummary, PropertyType } from '@repo/shared';
import { Heart, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePriceFormatter } from '@/hooks/use-price-formatter';
import { Link } from '@/i18n/navigation';

interface PropertyCardProps {
  property: PropertySummary;
}

const PROPERTY_TYPE_KEY: Record<PropertyType, string> = {
  APARTMENT: 'apartment',
  STUDIO: 'apartment',
  HOUSE: 'house',
  VILLA: 'villa',
  GUESTHOUSE: 'guesthouse',
  HOTEL_ROOM: 'apartment',
  OTHER: 'apartment',
};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=60';

export function PropertyCard({ property }: PropertyCardProps): React.JSX.Element {
  const t = useTranslations('property_card');
  const tc = useTranslations('property_card.categories');
  const { formatAmd } = usePriceFormatter();
  const ratingLabel = property.avgRating !== undefined ? property.avgRating.toFixed(1) : '—';
  const locationLine = property.region ? `${property.city}, ${property.region}` : property.city;
  return (
    <Link href={`/property/${property.id}`} className="group block">
      <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <PropertyCardMedia
          imageUrl={property.coverPhotoUrl ?? PLACEHOLDER_IMAGE}
          title={property.title}
          categoryLabel={tc(PROPERTY_TYPE_KEY[property.propertyType])}
        />
        <div className="p-4">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 flex-1 text-sm font-semibold text-foreground">
              {property.title}
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
  imageUrl: string;
  title: string;
  categoryLabel: string;
}

function PropertyCardMedia({
  imageUrl,
  title,
  categoryLabel,
}: PropertyCardMediaProps): React.JSX.Element {
  return (
    <div className="relative aspect-[4/3] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-white/90 px-2.5 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
        {categoryLabel}
      </span>
      {/* Instant Book is intentionally disabled for MVP. Re-enable once the feature ships.
      <span className="absolute bottom-3 left-3 inline-flex items-center rounded-md bg-primary/90 px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow">
        <Zap className="mr-1 h-3 w-3" aria-hidden />
        {tInstant('instant_book')}
      </span> */}
      <FavoriteButton />
    </div>
  );
}

function FavoriteButton(): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label="Save to favorites"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="absolute right-3 top-3 rounded-full bg-white/80 p-1.5 transition-colors hover:bg-white"
    >
      <Heart className="h-4 w-4 text-muted-foreground" aria-hidden />
    </button>
  );
}
