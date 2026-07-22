'use client';

import type { BookingDetail } from '@repo/shared';
import { DEPOSIT_CLAIM_WINDOW_HOURS } from '@repo/shared/constants';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DepositClaimDialog } from '@/components/bookings/deposit-claim-dialog';
import { ReleaseDepositDialog } from '@/components/bookings/release-deposit-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStoredMoney } from '@/lib/format/money';

interface HostDepositPanelProps {
  booking: BookingDetail;
  onDepositChanged: () => void;
}

function claimWindowDeadline(checkOut: string): Date {
  return new Date(new Date(checkOut).getTime() + DEPOSIT_CLAIM_WINDOW_HOURS * 60 * 60 * 1000);
}

export function HostDepositPanel({
  booking,
  onDepositChanged,
}: HostDepositPanelProps): React.JSX.Element | null {
  const t = useTranslations('booking.deposit_panel');
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  if (booking.securityDeposit <= 0) return null;
  const claim = booking.securityDepositClaim;
  const amountLabel = formatStoredMoney(booking.securityDeposit, booking.currency);
  const now = new Date();
  const windowStart = new Date(booking.checkOut);
  const deadline = claimWindowDeadline(booking.checkOut);
  const hoursLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (60 * 60 * 1000)));
  const windowOpen =
    booking.depositStatus === 'AUTHORIZED' && now >= windowStart && now <= deadline;
  const canRelease = booking.depositStatus === 'AUTHORIZED' && !claim;
  let statusContent: React.ReactNode;
  if (claim?.status === 'PENDING') {
    statusContent = (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        {t('claim_pending', { amount: formatStoredMoney(claim.amount, booking.currency) })}
      </p>
    );
  } else if (claim?.status === 'APPROVED') {
    statusContent = (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
        {t('claim_approved', { amount: formatStoredMoney(claim.amount, booking.currency) })}
      </p>
    );
  } else if (claim?.status === 'REJECTED') {
    statusContent = (
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
        {t('claim_rejected')}
      </p>
    );
  } else if (booking.depositStatus === 'RELEASED') {
    statusContent = (
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
        {t('released')}
      </p>
    );
  } else if (booking.depositStatus === 'AUTHORIZED' && now < windowStart) {
    statusContent = <p className="text-muted-foreground">{t('window_not_open')}</p>;
  } else if (windowOpen) {
    statusContent = (
      <p className="text-muted-foreground">{t('window_open', { hours: hoursLeft })}</p>
    );
  } else {
    statusContent = <p className="text-muted-foreground">{t('window_closed')}</p>;
  }
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          {t('title', { amount: amountLabel })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {statusContent}
        {canRelease ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {windowOpen ? (
              <Button className="flex-1" onClick={() => setClaimOpen(true)}>
                {t('charge_button')}
              </Button>
            ) : null}
            <Button className="flex-1" variant="outline" onClick={() => setReleaseOpen(true)}>
              {t('release_button')}
            </Button>
          </div>
        ) : null}
      </CardContent>
      <ReleaseDepositDialog
        bookingId={booking.id}
        depositAmount={booking.securityDeposit}
        currency={booking.currency}
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        onReleased={onDepositChanged}
      />
      <DepositClaimDialog
        bookingId={booking.id}
        depositAmount={booking.securityDeposit}
        currency={booking.currency}
        open={claimOpen}
        onOpenChange={setClaimOpen}
        onSubmitted={onDepositChanged}
      />
    </Card>
  );
}
