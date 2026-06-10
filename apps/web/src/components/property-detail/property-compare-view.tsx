import type { PropertyDetail } from '@repo/shared';
import { getLocalizedAddress, getLocalizedTitle } from '@repo/shared';
import { MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';
import { formatAmd } from '@/lib/format/price';
import { buildPropertyComparisonSummary } from '@/lib/property-comparison';

import { CompareShareButton } from './compare-share-button';

const AMENITY_PREVIEW_LIMIT = 6;

interface PropertyCompareViewProps {
  left: PropertyDetail;
  right: PropertyDetail;
}

function ComparePropertyColumn({
  property,
  title,
  locale,
  labels,
}: {
  property: PropertyDetail;
  title: string;
  locale: string;
  labels: {
    perNight: string;
    guests: string;
    bedrooms: string;
    bathrooms: string;
    amenities: string;
    reviews: string;
    noReviews: string;
    viewListing: string;
  };
}): React.JSX.Element {
  const address = getLocalizedAddress(property.addressLabels, locale, {
    city: property.city,
    region: property.region,
    street: property.street,
    formattedAddress: property.formattedAddress ?? property.addressLine ?? property.city,
  });
  const locationLine = [address.formattedAddress, property.country].filter(Boolean).join(', ');
  const coverUrl = property.photos[0]?.url ?? PROPERTY_PLACEHOLDER_IMAGE;
  const amenityPreview = property.amenities
    .slice(0, AMENITY_PREVIEW_LIMIT)
    .map((a) => a.name)
    .join(', ');
  const hasRating = (property.avgRating ?? 0) > 0 && property.reviewCount > 0;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        <Image
          src={coverUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        <p className="flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{locationLine}</span>
        </p>
        <p className="text-base font-semibold">
          {formatAmd(property.pricePerNight)}
          <span className="text-sm font-normal text-muted-foreground">{labels.perNight}</span>
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>{labels.guests}</li>
          <li>{labels.bedrooms}</li>
          <li>{labels.bathrooms}</li>
          <li>{labels.amenities}</li>
        </ul>
        {amenityPreview ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{amenityPreview}</p>
        ) : null}
        <p className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          {hasRating ? (
            <>
              <span className="font-semibold">{property.avgRating!.toFixed(1)}</span>
              <span className="text-muted-foreground">{labels.reviews}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{labels.noReviews}</span>
          )}
        </p>
        <Button variant="outline" size="sm" className="mt-auto w-full" asChild>
          <Link href={`/property/${property.id}`}>{labels.viewListing}</Link>
        </Button>
      </div>
    </article>
  );
}

export async function PropertyCompareView({
  left,
  right,
}: PropertyCompareViewProps): Promise<React.JSX.Element> {
  const locale = await getLocale();
  const t = await getTranslations('property.compare');
  const leftTitle = getLocalizedTitle(left.titleLabels, locale, left.title);
  const rightTitle = getLocalizedTitle(right.titleLabels, locale, right.title);
  const leftColumnLabels = {
    perNight: t('per_night'),
    guests: t('guests', { count: left.maxGuests }),
    bedrooms: t('bedrooms', { count: left.bedrooms }),
    bathrooms: t('bathrooms', { count: left.bathrooms }),
    amenities: t('amenities_count', { count: left.amenities.length }),
    reviews: t('reviews_count', { count: left.reviewCount }),
    noReviews: t('no_reviews'),
    viewListing: t('view_listing'),
  };
  const rightColumnLabels = {
    perNight: t('per_night'),
    guests: t('guests', { count: right.maxGuests }),
    bedrooms: t('bedrooms', { count: right.bedrooms }),
    bathrooms: t('bathrooms', { count: right.bathrooms }),
    amenities: t('amenities_count', { count: right.amenities.length }),
    reviews: t('reviews_count', { count: right.reviewCount }),
    noReviews: t('no_reviews'),
    viewListing: t('view_listing'),
  };
  const summary = buildPropertyComparisonSummary(left, right, leftTitle, rightTitle, {
    priceCheaper: (name) => t('summary.price_cheaper', { name }),
    priceTie: () => t('summary.price_tie'),
    amenitiesMore: (name, count, otherCount) =>
      t('summary.amenities_more', { name, count, otherCount }),
    amenitiesTie: (count) => t('summary.amenities_tie', { count }),
    reviewsMore: (name, count, otherCount) =>
      t('summary.reviews_more', { name, count, otherCount }),
    reviewsTie: (count) => t('summary.reviews_tie', { count }),
    reviewsNone: () => t('summary.reviews_none'),
    ratingHigher: (name, rating, otherRating) =>
      t('summary.rating_higher', { name, rating, otherRating }),
    ratingTie: (rating) => t('summary.rating_tie', { rating }),
    ratingInsufficient: () => t('summary.rating_insufficient'),
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">{t('page_title')}</h1>
        <CompareShareButton leftId={left.id} rightId={right.id} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ComparePropertyColumn
          property={left}
          title={leftTitle}
          locale={locale}
          labels={leftColumnLabels}
        />
        <ComparePropertyColumn
          property={right}
          title={rightTitle}
          locale={locale}
          labels={rightColumnLabels}
        />
      </div>
      <section className="mt-10 rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('summary_title')}</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-foreground">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
