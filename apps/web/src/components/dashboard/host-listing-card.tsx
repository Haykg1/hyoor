'use client';

import type { HostListingSummary } from '@repo/shared';
import { getLocalizedTitle, propertyTypeLabelKey } from '@repo/shared';
import { CalendarDays, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from '@/i18n/navigation';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';
import { formatAmd } from '@/lib/format/price';

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
}: HostListingCardProps): React.JSX.Element {
  const t = useTranslations('dashboard');
  const tType = useTranslations('property_card.categories');
  const locale = useLocale();
  const localizedTitle = getLocalizedTitle(listing.titleLabels, locale, listing.title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const canReactivate = listing.status === 'INACTIVE' && !!onReactivate;

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await onDelete(listing.id);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  async function handleConfirmReactivate() {
    if (!onReactivate) return;
    setIsReactivating(true);
    try {
      await onReactivate(listing.id);
    } finally {
      setIsReactivating(false);
      setReactivateOpen(false);
    }
  }

  const location = listing.region ? `${listing.city}, ${listing.region}` : listing.city;
  const canView = listing.status !== 'DRAFT' && listing.status !== 'INACTIVE';

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-20">
          <Image
            src={listing.coverPhotoUrl ?? PROPERTY_PLACEHOLDER_IMAGE}
            alt={localizedTitle}
            fill
            className="object-cover"
            unoptimized={!!listing.coverPhotoUrl}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{localizedTitle}</h3>
            <StatusBadge status={listing.status} namespace="property" />
          </div>
          <p className="text-xs text-muted-foreground">
            {location} · {formatAmd(listing.pricePerNight)}/{t('per_night')} ·{' '}
            {tType(propertyTypeLabelKey(listing.propertyType))}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canReactivate && (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={() => setReactivateOpen(true)}
              aria-label={t('actions.reactivate')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
            <Link href={`/dashboard/listings/${listing.id}/calendar`}>
              <CalendarDays className="h-3 w-3" />
              {t('actions.calendar')}
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
            <Link href={`/dashboard/listings/${listing.id}/edit`}>
              <Pencil className="h-3 w-3" />
              {t('actions.edit')}
            </Link>
          </Button>
          {canView && (
            <Button size="sm" variant="ghost" className="text-xs" asChild>
              <Link href={`/property/${listing.id}`}>
                <Eye className="mr-1 h-3 w-3" />
                {t('actions.view')}
              </Link>
            </Button>
          )}
          {showDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('soft_delete_title')}</DialogTitle>
            <DialogDescription>{t('soft_delete_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
              {t('capacity.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? t('deleting') : t('actions.soft_delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reactivate_title')}</DialogTitle>
            <DialogDescription>{t('reactivate_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivateOpen(false)}
              disabled={isReactivating}
            >
              {t('capacity.cancel')}
            </Button>
            <Button onClick={handleConfirmReactivate} disabled={isReactivating}>
              {isReactivating ? t('reactivating') : t('actions.reactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
