'use client';

import type { JSX } from 'react';

import { MoneyInput } from '@/components/ui/money-input';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { toSettlementAmount } from '@/lib/calendar/rate-display';
import { formatStoredMoney, majorToMinor, minorToMajor } from '@/lib/format/money';

interface SettlementMoneyInputProps {
  /** Amount in settlement currency minor units (always persisted as this currency). */
  value: number;
  onValueChange: (settlementMinor: number) => void;
  /** Stored currency for the listing/property (defaults to USD). */
  settlementCurrency?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  showSettlementApprox?: boolean;
}

/**
 * Money input that edits in the active display currency (AMD/USD/EUR) and emits
 * settlement minor units. Falls back to settlement currency when FX rates are unavailable
 * (same rule as the calendar rate editor).
 */
export function SettlementMoneyInput({
  value,
  onValueChange,
  settlementCurrency = 'USD',
  id,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
  showSettlementApprox = true,
}: SettlementMoneyInputProps): JSX.Element {
  const { displayCurrency, convert, rates } = useDisplayMoney();
  const displayMajor = convert(value, settlementCurrency);
  const inputCurrency = displayMajor === null ? settlementCurrency : displayCurrency;
  const displayMinor = displayMajor === null ? value : majorToMinor(displayMajor, inputCurrency);
  const showApprox = showSettlementApprox && inputCurrency !== settlementCurrency && value > 0;

  function handleChange(nextDisplayMinor: number): void {
    if (inputCurrency === settlementCurrency) {
      onValueChange(nextDisplayMinor);
      return;
    }
    const major = minorToMajor(nextDisplayMinor, inputCurrency);
    const settled = toSettlementAmount(major, inputCurrency, settlementCurrency, rates);
    onValueChange(settled ?? 0);
  }

  return (
    <div className="space-y-1">
      <MoneyInput
        id={id}
        currency={inputCurrency}
        value={displayMinor}
        onValueChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
      />
      {showApprox ? (
        <p className="text-xs text-muted-foreground">
          (~{formatStoredMoney(value, settlementCurrency)})
        </p>
      ) : null}
    </div>
  );
}

/** Active money-field currency for labels: display when FX works, else settlement. */
export function useMoneyInputCurrency(settlementCurrency = 'USD'): string {
  const { displayCurrency, convert } = useDisplayMoney();
  return convert(1, settlementCurrency) === null ? settlementCurrency : displayCurrency;
}
