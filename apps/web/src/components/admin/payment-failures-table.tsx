'use client';

import type { AdminPaymentFailure } from '@repo/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/i18n/navigation';

interface PaymentFailuresTableProps {
  failures: AdminPaymentFailure[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onResolve: (id: string) => Promise<void>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PaymentFailuresTable({
  failures,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
  onResolve,
}: PaymentFailuresTableProps): React.JSX.Element {
  const t = useTranslations('admin.payment_failures');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (failures.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty_state')}</p>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.created_at')}</TableHead>
              <TableHead>{t('table.category')}</TableHead>
              <TableHead>{t('table.booking')}</TableHead>
              <TableHead>{t('table.property')}</TableHead>
              <TableHead>{t('table.guest')}</TableHead>
              <TableHead>{t('table.host')}</TableHead>
              <TableHead>{t('table.message')}</TableHead>
              <TableHead>{t('table.resolved')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {failures.map((failure) => (
              <TableRow key={failure.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(failure.createdAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={failure.category} namespace="payment_failure" />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/bookings/${failure.bookingId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {failure.bookingId.slice(0, 10)}…
                  </Link>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-sm">
                  {failure.propertyTitle}
                </TableCell>
                <TableCell className="text-sm">{failure.guestName}</TableCell>
                <TableCell className="text-sm">{failure.hostName}</TableCell>
                <TableCell className="max-w-[220px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="line-clamp-1 text-sm text-muted-foreground">
                        {failure.message}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">{failure.message}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {failure.resolved ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      {t('resolved_badge')}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      {t('unresolved_badge')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!failure.resolved && (
                    <Button size="sm" variant="outline" onClick={() => onResolve(failure.id)}>
                      {t('resolve_button')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            {t('pagination.page_of', { page, totalPages, total })}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
