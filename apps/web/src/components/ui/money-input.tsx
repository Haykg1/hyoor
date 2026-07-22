'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import {
  formatMoneyInputDisplay,
  majorToMinor,
  minorToMajor,
  parseMoneyInput,
  sanitizeMoneyInputTyping,
} from '@/lib/format/money';

interface MoneyInputProps {
  /** Amount in minor currency units (e.g. 10000 = 100.00 USD). */
  value: number;
  onValueChange: (minor: number) => void;
  currency: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

function toDisplay(minor: number, currency: string): string {
  if (minor === 0) return '';
  return formatMoneyInputDisplay(minorToMajor(minor, currency), currency);
}

/**
 * Text input for money amounts. The user types major units (100), blur normalizes
 * the display (100.00) and the emitted value is an integer in minor units (10000).
 */
export function MoneyInput({
  value,
  onValueChange,
  currency,
  id,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
}: MoneyInputProps): React.JSX.Element {
  const [text, setText] = React.useState(() => toDisplay(value, currency));
  const [isFocused, setIsFocused] = React.useState(false);
  React.useEffect(() => {
    if (isFocused) return;
    setText(toDisplay(value, currency));
  }, [value, currency, isFocused]);
  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const cleaned = sanitizeMoneyInputTyping(e.target.value, currency);
    setText(cleaned);
    const major = parseMoneyInput(cleaned, currency);
    onValueChange(major === null ? 0 : majorToMinor(major, currency));
  }
  function handleBlur(): void {
    setIsFocused(false);
    const major = parseMoneyInput(text, currency);
    if (major === null) {
      setText('');
      onValueChange(0);
      return;
    }
    setText(formatMoneyInputDisplay(major, currency));
  }
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      onFocus={() => setIsFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
