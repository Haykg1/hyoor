'use client';

import type { HostListingSummary } from '@repo/shared';
import { getLocalizedTitle, propertyTypeLabelKey } from '@repo/shared';
import { CalendarDays, Eye, Power, PowerOff } from 'lucide-react';
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

interface AdminListingCardProps {
  listing: HostListingSummary;
  onDisable: (id: string) => Promise<void>;
  onEnable: (id: string) => Promise<void>;
}

export function AdminListingCard({
  listing,
  onDisable,
  onEnable,
}: AdminListingCardProps): React.JSX.Element {
  const t = useTranslations('dashboard');
  const tType = useTranslations('property_card.categories');
  const locale = useLocale();
  const localizedTitle = getLocalizedTitle(listing.titleLabels, locale, listing.title);
  const [disableOpen, setDisableOpen] = useState(false);
  const [enableOpen, setEnableOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const canDisable = listing.status !== 'INACTIVE';
  const canEnable =
    listing.status === 'INACTIVE' ||
    listing.status === 'SUSPENDED' ||
    listing.status === 'PENDING_REVIEW';
  const canView = listing.status === 'ACTIVE';

  async function handleDisable() {
    setIsUpdating(true);
    try {
      await onDisable(listing.id);
    } finally {
      setIsUpdating(false);
      setDisableOpen(false);
    }
  }

  async function handleEnable() {
    setIsUpdating(true);
    try {
      await onEnable(listing.id);
    } finally {
      setIsUpdating(false);
      setEnableOpen(false);
    }
  }

  const location = listing.region ? `${listing.city}, ${listing.region}` : listing.city;

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
          <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
            <Link href={`/dashboard/listings/${listing.id}/calendar`}>
              <CalendarDays className="h-3 w-3" />
              {t('actions.calendar')}
            </Link>
          </Button>
          {canEnable && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => setEnableOpen(true)}
            >
              <Power className="h-3 w-3" />
              {t('actions.enable')}
            </Button>
          )}
          {canDisable && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-destructive hover:text-destructive"
              onClick={() => setDisableOpen(true)}
            >
              <PowerOff className="h-3 w-3" />
              {t('actions.disable')}
            </Button>
          )}
          {canView && (
            <Button size="sm" variant="ghost" className="text-xs" asChild>
              <Link href={`/property/${listing.id}`}>
                <Eye className="mr-1 h-3 w-3" />
                {t('actions.view')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.disable_title')}</DialogTitle>
            <DialogDescription>{t('admin.disable_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)} disabled={isUpdating}>
              {t('capacity.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDisable} disabled={isUpdating}>
              {isUpdating ? t('admin.disabling') : t('actions.disable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enableOpen} onOpenChange={setEnableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.enable_title')}</DialogTitle>
            <DialogDescription>{t('admin.enable_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnableOpen(false)} disabled={isUpdating}>
              {t('capacity.cancel')}
            </Button>
            <Button onClick={handleEnable} disabled={isUpdating}>
              {isUpdating ? t('admin.enabling') : t('actions.enable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
