'use client';

import type { AiSearchPropertyResult, PropertySummary } from '@repo/shared';
import { getLocalizedAddress, getLocalizedTitle, propertyTypeLabelKey } from '@repo/shared';
import { Star } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { TransitionLink } from '@/i18n/transition-link';
import { formatSuggestedStayRange } from '@/lib/ai-search/filters-display';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';
import { propertyImageTransitionStyle } from '@/lib/constants/view-transitions';
import { cn } from '@/lib/utils';

import { FavoriteButton } from './favorite-button';
import { PropertyPriceDisplay } from './property-price-display';

const CARD_PHOTO_MAX = 5;
const CARD_IMAGE_QUALITY = 70;
const CARD_IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw';

interface PropertyCardProps {
  property: PropertySummary | AiSearchPropertyResult;
  showSuggestedDates?: boolean;
  showAiMatch?: boolean;
}

function buildPropertyHref(
  propertyId: string,
  property: PropertySummary | AiSearchPropertyResult,
  showSuggestedDates: boolean,
): string {
  const base = `/property/${propertyId}`;
  if (!showSuggestedDates) return base;
  const suggested = property as AiSearchPropertyResult;
  if (!suggested.suggestedCheckIn || !suggested.suggestedCheckOut) return base;
  const query = new URLSearchParams({
    checkIn: suggested.suggestedCheckIn,
    checkOut: suggested.suggestedCheckOut,
  });
  return `${base}?${query.toString()}`;
}

function resolveCardPhotoUrls(property: PropertySummary): string[] {
  if (property.photoUrls && property.photoUrls.length > 0) {
    return property.photoUrls.slice(0, CARD_PHOTO_MAX);
  }
  if (property.coverPhotoUrl) return [property.coverPhotoUrl];
  return [PROPERTY_PLACEHOLDER_IMAGE];
}

export function PropertyCard({
  property,
  showSuggestedDates = false,
  showAiMatch = false,
}: PropertyCardProps): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations('property_card');
  const tc = useTranslations('property_card.categories');
  const ratingLabel = property.avgRating !== undefined ? property.avgRating.toFixed(1) : '—';
  const address = getLocalizedAddress(property.addressLabels, locale, {
    city: property.city,
    region: property.region,
    street: null,
    formattedAddress: property.city,
  });
  const localizedTitle = getLocalizedTitle(property.titleLabels, locale, property.title);
  const locationLine = address.region ? `${address.city}, ${address.region}` : (address.city ?? '');
  const suggested = property as AiSearchPropertyResult;
  const suggestedLabel =
    showSuggestedDates && suggested.suggestedCheckIn && suggested.suggestedCheckOut
      ? formatSuggestedStayRange(suggested.suggestedCheckIn, suggested.suggestedCheckOut)
      : null;
  return (
    <TransitionLink
      href={buildPropertyHref(property.id, property, showSuggestedDates)}
      className="group block"
    >
      <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <PropertyCardMedia
          propertyId={property.id}
          photoUrls={resolveCardPhotoUrls(property)}
          title={localizedTitle}
          categoryLabel={tc(propertyTypeLabelKey(property.propertyType))}
          showAiMatch={showAiMatch}
          aiMatchLabel={t('ai_match')}
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
          {suggestedLabel ? (
            <p className="mb-2 text-xs font-medium text-primary">
              {t('available_dates', { dates: suggestedLabel })}
            </p>
          ) : null}
          <div className="flex items-center justify-between">
            <PropertyPriceDisplay
              pricePerNight={property.pricePerNight}
              currency={property.currency}
              displayPrice={property.displayPrice}
              suffix={
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {t('per_night')}
                </span>
              }
            />
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
    </TransitionLink>
  );
}

interface PropertyCardMediaProps {
  propertyId: string;
  photoUrls: string[];
  title: string;
  categoryLabel: string;
  showAiMatch?: boolean;
  aiMatchLabel?: string;
}

function PropertyCardMedia({
  propertyId,
  photoUrls,
  title,
  categoryLabel,
  showAiMatch = false,
  aiMatchLabel,
}: PropertyCardMediaProps): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activatedIndexes, setActivatedIndexes] = useState<Set<number>>(() => new Set([0]));
  const zoneCount = Math.min(photoUrls.length, CARD_PHOTO_MAX);
  const canScrub = zoneCount > 1;
  const visibleIndex = Math.min(activeIndex, zoneCount - 1);
  const activateIndex = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), zoneCount - 1);
      setActiveIndex(clamped);
      setActivatedIndexes((prev) => {
        if (prev.has(clamped)) return prev;
        const next = new Set(prev);
        next.add(clamped);
        return next;
      });
    },
    [zoneCount],
  );
  const handleZoneEnter = useCallback(
    (zoneIndex: number) => {
      if (!canScrub) return;
      activateIndex(zoneIndex);
    },
    [activateIndex, canScrub],
  );
  const handleLeave = useCallback(() => {
    setActiveIndex(0);
  }, []);
  return (
    <div
      className="relative aspect-[4/3] overflow-hidden"
      style={propertyImageTransitionStyle(propertyId)}
      onMouseLeave={canScrub ? handleLeave : undefined}
    >
      {photoUrls.slice(0, zoneCount).map((url, index) => {
        if (!activatedIndexes.has(index)) return null;
        return (
          <Image
            key={`${url}-${index}`}
            src={url}
            alt={title}
            fill
            loading={index === 0 ? 'lazy' : 'eager'}
            quality={CARD_IMAGE_QUALITY}
            sizes={CARD_IMAGE_SIZES}
            className={cn(
              'object-cover transition-opacity duration-150',
              index === visibleIndex ? 'opacity-100' : 'opacity-0',
            )}
          />
        );
      })}
      {canScrub ? (
        <div
          className="absolute inset-0 z-[1] hidden [@media(pointer:fine)]:grid"
          style={{ gridTemplateColumns: `repeat(${zoneCount}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {Array.from({ length: zoneCount }, (_, zoneIndex) => (
            <div
              key={zoneIndex}
              className="h-full w-full"
              onMouseEnter={() => handleZoneEnter(zoneIndex)}
            />
          ))}
        </div>
      ) : null}
      {canScrub ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-2 z-[2] hidden justify-center gap-1 [@media(pointer:fine)]:flex"
          aria-hidden
        >
          {Array.from({ length: zoneCount }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 w-1 rounded-full transition-colors',
                index === visibleIndex ? 'bg-white' : 'bg-white/50',
              )}
            />
          ))}
        </div>
      ) : null}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-3.5rem)] flex-col items-start gap-1.5">
        {showAiMatch && aiMatchLabel ? (
          <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
            {aiMatchLabel}
          </span>
        ) : null}
        <span className="inline-flex items-center rounded-md bg-white/90 px-2.5 py-0.5 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur">
          {categoryLabel}
        </span>
      </div>
      <div className="absolute inset-0 z-10 pointer-events-none [&>*]:pointer-events-auto">
        <FavoriteButton propertyId={propertyId} />
      </div>
    </div>
  );
}
