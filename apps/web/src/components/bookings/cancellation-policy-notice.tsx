'use client';

import type { CancellationFeeType } from '@repo/shared';
import { getGuestCancellationWindowStatus } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { formatBookingDate } from '@/lib/format/booking-date';
import { formatStoredMoney } from '@/lib/format/money';
import { cn } from '@/lib/utils';

interface CancellationPolicyNoticeProps {
  cancellationPolicy: string;
  cancellationFeeType: CancellationFeeType;
  cancellationFeeValue: number;
  cancellationDeadlineDays?: number;
  currency: string;
  /** When set, adds stay-specific cancel window copy for the chosen check-in. */
  checkIn?: string;
  /** Guest-facing copy (“you can cancel…”) vs listing/host wording. */
  audience?: 'guest' | 'listing';
  className?: string;
}

export function CancellationPolicyNotice({
  cancellationPolicy,
  cancellationFeeType,
  cancellationFeeValue,
  cancellationDeadlineDays = 0,
  currency,
  checkIn,
  audience = 'listing',
  className,
}: CancellationPolicyNoticeProps): React.JSX.Element {
  const t = useTranslations('booking.cancellation_policy');
  const isGuest = audience === 'guest';
  let body: string;
  if (cancellationPolicy === 'NON_REFUNDABLE') {
    body = isGuest ? t('non_refundable_guest') : t('non_refundable');
  } else if (cancellationFeeValue <= 0) {
    body = isGuest ? t('free_guest') : t('free');
  } else if (cancellationFeeType === 'FIXED') {
    body = t(isGuest ? 'fixed_guest' : 'fixed', {
      amount: formatStoredMoney(cancellationFeeValue, currency),
    });
  } else {
    body = t(isGuest ? 'percent_guest' : 'percent', { percent: cancellationFeeValue });
  }
  const deadlineLine =
    cancellationPolicy === 'NON_REFUNDABLE'
      ? null
      : cancellationDeadlineDays <= 0
        ? t(isGuest ? 'deadline_until_check_in_guest' : 'deadline_until_check_in')
        : t(isGuest ? 'deadline_days_before_guest' : 'deadline_days_before', {
            days: cancellationDeadlineDays,
          });
  let stayLine: string | null = null;
  if (isGuest && checkIn && cancellationPolicy !== 'NON_REFUNDABLE') {
    const window = getGuestCancellationWindowStatus({
      cancellationPolicy,
      checkIn,
      cancellationDeadlineDays,
    });
    if (!window.canCancel || !window.deadlineIso) {
      stayLine = t('stay_deadline_closed');
    } else {
      stayLine = t('stay_deadline_open', {
        date: formatBookingDate(window.deadlineIso),
        days: window.daysLeft,
      });
    }
  }
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <p className="font-medium text-foreground">{t('title')}</p>
      <p className="mt-0.5">{body}</p>
      {deadlineLine ? <p className="mt-0.5">{deadlineLine}</p> : null}
      {stayLine ? <p className="mt-0.5 font-medium text-foreground">{stayLine}</p> : null}
    </div>
  );
}
