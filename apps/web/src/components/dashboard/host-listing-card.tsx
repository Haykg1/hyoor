'use client';

import type { HostListingSummary } from '@repo/shared';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
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
import { formatAmd } from '@/lib/format/price';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=60';

interface HostListingCardProps {
  listing: HostListingSummary;
  showDelete: boolean;
  onDelete: (id: string) => Promise<void>;
}

export function HostListingCard({
  listing,
  showDelete,
  onDelete,
}: HostListingCardProps): React.JSX.Element {
  const t = useTranslations('dashboard');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await onDelete(listing.id);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  const location = listing.region ? `${listing.city}, ${listing.region}` : listing.city;

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-20">
          <Image
            src={listing.coverPhotoUrl ?? PLACEHOLDER_IMAGE}
            alt={listing.title}
            fill
            className="object-cover"
            unoptimized={!!listing.coverPhotoUrl}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{listing.title}</h3>
            <StatusBadge status={listing.status} namespace="property" />
          </div>
          <p className="text-xs text-muted-foreground">
            {location} · {formatAmd(listing.pricePerNight)}/{t('per_night')} ·{' '}
            {listing.propertyType.charAt(0) + listing.propertyType.slice(1).toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button size="sm" variant="outline" disabled className="gap-1 text-xs">
            <Pencil className="h-3 w-3" />
            {t('actions.edit')}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" asChild>
            <Link href={`/property/${listing.id}`}>
              <Eye className="mr-1 h-3 w-3" />
              {t('actions.view')}
            </Link>
          </Button>
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
    </>
  );
}
