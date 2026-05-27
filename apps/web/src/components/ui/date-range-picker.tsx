'use client';

import { CalendarDays } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtShort(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseIso(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface DateRangePickerProps {
  from?: string;
  to?: string;
  onSelect: (from: string, to: string) => void;
  disabledDates?: Date[];
  placeholder?: string;
  className?: string;
  numberOfMonths?: number;
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
  triggerLabel?: string;
}

export function DateRangePicker({
  from,
  to,
  onSelect,
  disabledDates = [],
  placeholder = 'Add dates',
  className,
  numberOfMonths = 2,
  align = 'start',
  triggerClassName,
  triggerLabel,
}: DateRangePickerProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const fromDate = parseIso(from);
  const toDate = parseIso(to);
  const range: DateRange = { from: fromDate, to: toDate };

  const today = startOfDay(new Date());

  const isDisabled = React.useCallback(
    (date: Date) => {
      if (date < today) return true;
      return disabledDates.some((d) => isSameDay(d, date));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabledDates, today.toDateString()],
  );

  function handleSelect(selected: DateRange | undefined): void {
    const f = selected?.from ? toIso(selected.from) : '';
    const t = selected?.to ? toIso(selected.to) : '';
    onSelect(f, t);
    if (f && t) setOpen(false);
  }

  const label =
    triggerLabel ??
    (fromDate
      ? toDate
        ? `${fmtShort(fromDate)} – ${fmtShort(toDate)}`
        : fmtShort(fromDate)
      : placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className={cn(
            'h-auto w-full justify-start gap-2 px-0 font-normal hover:bg-transparent',
            !fromDate ? 'text-muted-foreground' : 'text-foreground',
            triggerClassName,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-auto p-0', className)} align={align}>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={fromDate ?? today}
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          disabled={isDisabled}
          modifiers={{ blocked: disabledDates.filter((d) => d >= today) }}
          modifiersClassNames={{ blocked: 'line-through opacity-40' }}
        />
      </PopoverContent>
    </Popover>
  );
}
