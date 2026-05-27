'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BOOKING_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED_BY_GUEST: 'bg-destructive/10 text-destructive',
  CANCELLED_BY_HOST: 'bg-destructive/10 text-destructive',
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

export function StatusBadge({
  status,
  namespace,
}: {
  status: string;
  namespace: 'booking' | 'property';
}): React.JSX.Element {
  const t = useTranslations(namespace);
  const styles =
    namespace === 'booking' ? BOOKING_STATUS_STYLES[status] : PROPERTY_STATUS_STYLES[status];
  return (
    <Badge
      variant="secondary"
      className={cn('font-medium', styles ?? 'bg-muted text-muted-foreground')}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
