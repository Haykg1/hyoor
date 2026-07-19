'use client';

import { CalendarDays, Eye, PauseCircle, Pencil, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { JSX } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface HostListingCardActionsProps {
  listingId: string;
  canView: boolean;
  canPause: boolean;
  canActivate: boolean;
  onPause: () => void;
  onActivate: () => void;
}

export function HostListingCardActions({
  listingId,
  canView,
  canPause,
  canActivate,
  onPause,
  onActivate,
}: HostListingCardActionsProps): JSX.Element {
  const t = useTranslations('dashboard');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs" asChild>
        <Link href={`/dashboard/listings/${listingId}/edit`}>
          <Pencil className="h-3.5 w-3.5" />
          {t('actions.edit')}
        </Link>
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs" asChild>
        <Link href={`/dashboard/listings/${listingId}/calendar`}>
          <CalendarDays className="h-3.5 w-3.5" />
          {t('actions.availability')}
        </Link>
      </Button>
      {canPause ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-full text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/40"
          onClick={onPause}
        >
          <PauseCircle className="h-3.5 w-3.5" />
          {t('actions.pause_listing')}
        </Button>
      ) : null}
      {canActivate ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-full text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/40"
          onClick={onActivate}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('actions.activate_listing')}
        </Button>
      ) : null}
      {canView ? (
        <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs" asChild>
          <Link href={`/property/${listingId}`}>
            <Eye className="h-3.5 w-3.5" />
            {t('actions.preview')}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
