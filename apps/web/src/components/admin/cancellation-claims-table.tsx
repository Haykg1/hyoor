'use client';

import type { AdminCancellationFeeClaim } from '@repo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { reviewCancellationClaim } from '@/lib/api/cancellation-claims';
import { formatStoredMoney } from '@/lib/format/money';

interface CancellationClaimsTableProps {
  claims: AdminCancellationFeeClaim[];
  isLoading: boolean;
  onReviewed: () => void;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CancellationClaimsTable({
  claims,
  isLoading,
  onReviewed,
}: CancellationClaimsTableProps): React.JSX.Element {
  const t = useTranslations('admin.cancellation_claims');
  const [selected, setSelected] = useState<AdminCancellationFeeClaim | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null);
  function openReview(claim: AdminCancellationFeeClaim): void {
    setSelected(claim);
    setReviewNote('');
  }
  async function handleReview(status: 'APPROVED' | 'REJECTED'): Promise<void> {
    if (!selected) return;
    setSubmitting(status);
    try {
      await reviewCancellationClaim(selected.id, {
        status,
        reviewNote: reviewNote.trim() || undefined,
      });
      toast.success(status === 'APPROVED' ? t('approve_success') : t('decline_success'));
      setSelected(null);
      onReviewed();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : t('error');
      toast.error(message);
    } finally {
      setSubmitting(null);
    }
  }
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (claims.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty_state')}</p>;
  }
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.created_at')}</TableHead>
            <TableHead>{t('table.booking')}</TableHead>
            <TableHead>{t('table.property')}</TableHead>
            <TableHead>{t('table.guest')}</TableHead>
            <TableHead>{t('table.host')}</TableHead>
            <TableHead>{t('table.rent')}</TableHead>
            <TableHead>{t('table.fee')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => (
            <TableRow key={claim.id}>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTime(claim.createdAt)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/bookings/${claim.bookingId}`}
                  className="text-sm text-primary hover:underline"
                >
                  {claim.bookingId.slice(0, 10)}…
                </Link>
              </TableCell>
              <TableCell className="max-w-[160px] truncate text-sm">
                {claim.propertyTitle}
              </TableCell>
              <TableCell className="text-sm">{claim.guestName}</TableCell>
              <TableCell className="text-sm">{claim.hostName}</TableCell>
              <TableCell className="whitespace-nowrap text-sm tabular-nums">
                {formatStoredMoney(claim.rentAmount, claim.currency)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm font-medium tabular-nums">
                {formatStoredMoney(claim.amount, claim.currency)}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => openReview(claim)}>
                  {t('review_button')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('dialog.title')}</DialogTitle>
                <DialogDescription>
                  {t('dialog.description', {
                    amount: formatStoredMoney(selected.amount, selected.currency),
                    rent: formatStoredMoney(selected.rentAmount, selected.currency),
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <p>
                    <span className="text-muted-foreground">{t('dialog.property')}: </span>
                    {selected.propertyTitle}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('dialog.stay')}: </span>
                    {formatDate(selected.checkIn)} – {formatDate(selected.checkOut)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('dialog.guest')}: </span>
                    {selected.guestName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('dialog.host')}: </span>
                    {selected.hostName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{t('dialog.reason')}</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground">
                    {selected.reason || t('dialog.no_reason')}
                  </p>
                </div>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                  {t('dialog.review_hint')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="cancellation-review-note">{t('dialog.note_label')}</Label>
                  <Textarea
                    id="cancellation-review-note"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder={t('dialog.note_placeholder')}
                    rows={3}
                    disabled={submitting !== null}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleReview('REJECTED')}
                  disabled={submitting !== null}
                >
                  {submitting === 'REJECTED' ? t('dialog.declining') : t('dialog.decline')}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleReview('APPROVED')}
                  disabled={submitting !== null}
                >
                  {submitting === 'APPROVED' ? t('dialog.approving') : t('dialog.approve')}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
