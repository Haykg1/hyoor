'use client';

import type { HostListingSummary } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { BedDouble, MapPin, Star, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type JSX } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { HostListingCardActions } from './host-listing-card-actions';
import { HostListingCardMedia } from './host-listing-card-media';
import { HostListingCardPrice } from './host-listing-card-price';

interface HostListingCardProps {
  listing: HostListingSummary;
  showDelete: boolean;
  onDelete: (id: string) => Promise<void>;
  onReactivate?: (id: string) => Promise<void>;
}

export function HostListingCard({
  listing,
  showDelete,
  onDelete,
  onReactivate,
}: HostListingCardProps): JSX.Element {
  const t = useTranslations('dashboard');
  const tCard = useTranslations('property_card');
  const locale = useLocale();
  const localizedTitle = getLocalizedTitle(listing.titleLabels, locale, listing.title);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const canActivate = listing.status === 'INACTIVE' && !!onReactivate;
  const canPause = listing.status === 'ACTIVE' && showDelete;
  const canView = listing.status !== 'DRAFT' && listing.status !== 'INACTIVE';
  const showEarnings = listing.status === 'ACTIVE' && listing.totalEarnings > 0;
  const showRating = listing.status === 'ACTIVE' && listing.reviewCount > 0;
  const location = listing.region ? `${listing.city}, ${listing.region}` : listing.city;

  async function handleConfirmPause() {
    setIsPausing(true);
    try {
      await onDelete(listing.id);
    } finally {
      setIsPausing(false);
      setPauseOpen(false);
    }
  }

  async function handleConfirmActivate() {
    if (!onReactivate) return;
    setIsActivating(true);
    try {
      await onReactivate(listing.id);
    } finally {
      setIsActivating(false);
      setActivateOpen(false);
    }
  }

  return (
    <>
      <article className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-lg">
        <div className="flex flex-col md:flex-row">
          <HostListingCardMedia
            coverPhotoUrl={listing.coverPhotoUrl}
            title={localizedTitle}
            status={listing.status}
            priceChip={
              <HostListingCardPrice
                pricePerNight={listing.pricePerNight}
                currency={listing.currency}
                totalEarnings={listing.totalEarnings}
                showEarnings={false}
                compact
              />
            }
            className="aspect-[4/3] w-full md:aspect-auto md:w-72 md:min-h-[220px] lg:w-80"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-snug text-foreground md:text-lg">
                  {localizedTitle}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{location}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" aria-hidden />
                    {tCard('bedrooms', { count: listing.bedrooms })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {t('listing.guests_up_to', { count: listing.maxGuests })}
                  </span>
                  {showRating && listing.avgRating !== undefined ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
                      <span className="font-medium text-foreground">
                        {listing.avgRating.toFixed(1)}
                      </span>
                      <span className="text-primary/80">
                        ({tCard('reviews', { count: listing.reviewCount })})
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
              <HostListingCardPrice
                pricePerNight={listing.pricePerNight}
                currency={listing.currency}
                totalEarnings={listing.totalEarnings}
                showEarnings={showEarnings}
                className="hidden shrink-0 md:block"
              />
            </div>
            <div className="mt-auto">
              <HostListingCardActions
                listingId={listing.id}
                canView={canView}
                canPause={canPause}
                canActivate={canActivate}
                onPause={() => setPauseOpen(true)}
                onActivate={() => setActivateOpen(true)}
              />
            </div>
          </div>
        </div>
      </article>

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('soft_delete_title')}</DialogTitle>
            <DialogDescription>{t('soft_delete_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)} disabled={isPausing}>
              {t('capacity.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmPause} disabled={isPausing}>
              {isPausing ? t('deleting') : t('actions.pause_listing')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reactivate_title')}</DialogTitle>
            <DialogDescription>{t('reactivate_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivateOpen(false)}
              disabled={isActivating}
            >
              {t('capacity.cancel')}
            </Button>
            <Button onClick={handleConfirmActivate} disabled={isActivating}>
              {isActivating ? t('reactivating') : t('actions.activate_listing')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
