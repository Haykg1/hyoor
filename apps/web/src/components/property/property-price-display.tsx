import type { ReactNode } from 'react';

import { formatCurrencyAmount } from '@/lib/format/price';

interface PropertyPriceDisplayProps {
  pricePerNight: number;
  currency: string;
  /** Guest-selected display estimate. When present, this is the primary shown amount. */
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
  const hasDisplay = Boolean(displayPrice);
  const isEstimate =
    hasDisplay && displayPrice!.currency !== currency && displayPrice!.amount !== pricePerNight;
  const mainText = hasDisplay
    ? `${isEstimate ? '~' : ''}${formatCurrencyAmount(displayPrice!.amount, displayPrice!.currency)}`
    : formatCurrencyAmount(pricePerNight, currency);
  const showListingCurrency = hasDisplay && displayPrice!.currency !== currency;
  return (
    <span className="inline-flex flex-col">
      <span className={mainClassName}>
        {mainText}
        {suffix}
      </span>
      {showListingCurrency ? (
        <span className={secondaryClassName}>{formatCurrencyAmount(pricePerNight, currency)}</span>
      ) : null}
    </span>
  );
}
