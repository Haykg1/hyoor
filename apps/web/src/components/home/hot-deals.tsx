'use client';

import type { HotDealProperty } from '@repo/shared';
import { getLocalizedAddress, getLocalizedTitle, propertyTypeLabelKey } from '@repo/shared';
import { ArrowRight, Flame, Star, Timer } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { usePriceFormatter } from '@/hooks/use-price-formatter';
import { Link } from '@/i18n/navigation';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';

interface HotDealsProps {
  deals: HotDealProperty[];
}

function daysUntil(isoDate: string): number {
  const end = new Date(`${isoDate}T23:59:59Z`);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function HotDealCard({ deal }: { deal: HotDealProperty }): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations('home.hot_deals');
  const tc = useTranslations('property_card.categories');
  const { formatAmd } = usePriceFormatter();

  const localizedTitle = getLocalizedTitle(deal.titleLabels, locale, deal.title);
  const address = getLocalizedAddress(deal.addressLabels, locale, {
    city: deal.city,
    region: deal.region,
    street: null,
    formattedAddress: deal.city,
  });
  const locationLine = address.region ? `${address.city}, ${address.region}` : (address.city ?? '');
  const ratingLabel = deal.avgRating !== undefined ? deal.avgRating.toFixed(1) : '—';
  const days = daysUntil(deal.bookingEndDate);

  const discountLabel =
    deal.discountType === 'PERCENT' && deal.discountPercent != null
      ? `−${deal.discountPercent}%`
      : deal.discountAmount != null
        ? `−${formatAmd(deal.discountAmount)}`
        : null;

  const discountedPrice =
    deal.discountType === 'PERCENT' && deal.discountPercent != null
      ? Math.round(deal.pricePerNight * (1 - deal.discountPercent / 100))
      : deal.discountAmount != null
        ? Math.max(0, deal.pricePerNight - deal.discountAmount)
        : null;

  return (
    <Link href={`/property/${deal.id}`} className="group block shrink-0 w-64 sm:w-auto">
      <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={deal.coverPhotoUrl ?? PROPERTY_PLACEHOLDER_IMAGE}
            alt={localizedTitle}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 256px, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Category pill */}
          <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-white/90 px-2.5 py-0.5 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur">
            {tc(propertyTypeLabelKey(deal.propertyType as import('@repo/shared').PropertyType))}
          </span>
          {/* Discount badge */}
          {discountLabel && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white shadow">
              <Flame className="h-3 w-3" aria-hidden />
              {discountLabel}
            </span>
          )}
        </div>

        {/* Body */}
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

          {/* Price row */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              {discountedPrice != null ? (
                <>
                  <span className="font-bold text-rose-600">{formatAmd(discountedPrice)}</span>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatAmd(deal.pricePerNight)}
                  </span>
                </>
              ) : (
                <span className="font-bold text-foreground">{formatAmd(deal.pricePerNight)}</span>
              )}
              <span className="text-xs text-muted-foreground">{t('per_night')}</span>
            </div>
          </div>

          {/* Expiry countdown */}
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{days === 0 ? t('expires_today') : t('expires_in_days', { count: days })}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function HotDeals({ deals }: HotDealsProps): React.JSX.Element | null {
  const t = useTranslations('home.hot_deals');

  if (deals.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Flame className="h-6 w-6 text-rose-500" aria-hidden />
            <h2 className="text-2xl font-bold sm:text-3xl">{t('title')}</h2>
          </div>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href="/search"
          className="hidden items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 sm:inline-flex"
        >
          {t('see_all')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {deals.map((deal) => (
          <HotDealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  );
}
