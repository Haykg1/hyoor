import type { ReactNode } from 'react';

import { formatCurrencyAmount } from '@/lib/format/price';

interface PropertyPriceDisplayProps {
  pricePerNight: number;
  currency: string;
  /** Cosmetic, non-charged estimate in the guest's local currency — never rendered if it
   * matches `currency` (nothing to estimate) or is missing (rates unavailable). */
  displayPrice?: { amount: number; currency: string } | null;
  mainClassName?: string;
  secondaryClassName?: string;
  /** Rendered inline after the main price line, e.g. a "per night" label. */
  suffix?: ReactNode;
}

export function PropertyPriceDisplay({
  pricePerNight,
  currency,
  displayPrice,
  mainClassName = 'font-bold text-foreground',
  secondaryClassName = 'text-xs text-muted-foreground',
  suffix,
}: PropertyPriceDisplayProps): React.JSX.Element {
  const showEstimate = Boolean(displayPrice) && displayPrice?.currency !== currency;
  const mainText = showEstimate
    ? `~${formatCurrencyAmount(displayPrice!.amount, displayPrice!.currency)}`
    : formatCurrencyAmount(pricePerNight, currency);
  return (
    <span className="inline-flex flex-col">
      <span className={mainClassName}>
        {mainText}
        {suffix}
      </span>
      {showEstimate && (
        <span className={secondaryClassName}>{formatCurrencyAmount(pricePerNight, currency)}</span>
      )}
    </span>
  );
}
