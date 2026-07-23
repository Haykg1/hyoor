'use client';

import type { CancellationFeeType } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { formatStoredMoney } from '@/lib/format/money';
import { cn } from '@/lib/utils';

interface CancellationPolicyNoticeProps {
  cancellationPolicy: string;
  cancellationFeeType: CancellationFeeType;
  cancellationFeeValue: number;
  currency: string;
  className?: string;
}

export function CancellationPolicyNotice({
  cancellationPolicy,
  cancellationFeeType,
  cancellationFeeValue,
  currency,
  className,
}: CancellationPolicyNoticeProps): React.JSX.Element {
  const t = useTranslations('booking.cancellation_policy');
  let body: string;
  if (cancellationPolicy === 'NON_REFUNDABLE') {
    body = t('non_refundable');
  } else if (cancellationFeeValue <= 0) {
    body = t('free');
  } else if (cancellationFeeType === 'FIXED') {
    body = t('fixed', { amount: formatStoredMoney(cancellationFeeValue, currency) });
  } else {
    body = t('percent', { percent: cancellationFeeValue });
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
    </div>
  );
}
