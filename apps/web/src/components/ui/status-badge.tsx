'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BOOKING_STATUS_STYLES: Record<string, string> = {
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED_BY_GUEST: 'bg-destructive/10 text-destructive',
  CANCELLED_BY_HOST: 'bg-destructive/10 text-destructive',
  PAYMENT_EXPIRED: 'bg-muted text-muted-foreground',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  NO_SHOW: 'bg-muted text-muted-foreground',
};

const PROPERTY_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-destructive/10 text-destructive',
};

const PAYMENT_FAILURE_CATEGORY_STYLES: Record<string, string> = {
  RENT_CAPTURE_FAILED: 'bg-destructive/10 text-destructive',
  DEPOSIT_RELEASE_FAILED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  DEPOSIT_CLAIM_TRANSFER_FAILED: 'bg-destructive/10 text-destructive',
  PAYOUT_TRANSFER_FAILED: 'bg-destructive/10 text-destructive',
  PAYMENT_LOCK_SWEEP_FAILED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLATION_CAPTURE_FAILED: 'bg-destructive/10 text-destructive',
};

export function StatusBadge({
  status,
  namespace,
}: {
  status: string;
  namespace: 'booking' | 'property' | 'payment_failure';
}): React.JSX.Element {
  const t = useTranslations(namespace === 'payment_failure' ? 'admin.payment_failures' : namespace);
  const styles =
    namespace === 'booking'
      ? BOOKING_STATUS_STYLES[status]
      : namespace === 'property'
        ? PROPERTY_STATUS_STYLES[status]
        : PAYMENT_FAILURE_CATEGORY_STYLES[status];
  const labelKey =
    namespace === 'payment_failure' ? `filters.category_values.${status}` : `status.${status}`;
  return (
    <Badge
      variant="secondary"
      className={cn('font-medium', styles ?? 'bg-muted text-muted-foreground')}
    >
      {t(labelKey)}
    </Badge>
  );
}
