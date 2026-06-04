'use client';

import type { AvailabilityDayView } from '@repo/shared';

import { formatAmd } from '@/lib/format/price';
import { cn } from '@/lib/utils';

interface AvailabilityMonthProps {
  monthDate: Date;
  daysByDate: Record<string, AvailabilityDayView>;
  selectedDates: Set<string>;
  basePricePerNight: number;
  onDayClick: (iso: string) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function buildGrid(monthDate: Date): Array<string | null> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDow + 6) % 7;
  const cells: Array<string | null> = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(isoFor(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

export function AvailabilityMonth({
  monthDate,
  daysByDate,
  selectedDates,
  basePricePerNight,
  onDayClick,
}: AvailabilityMonthProps): React.JSX.Element {
  const cells = buildGrid(monthDate);
  const heading = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {DAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, idx) =>
          iso ? (
            <DayCell
              key={iso}
              iso={iso}
              day={daysByDate[iso]}
              isSelected={selectedDates.has(iso)}
              basePricePerNight={basePricePerNight}
              isPast={iso < TODAY_ISO}
              isToday={iso === TODAY_ISO}
              onClick={() => onDayClick(iso)}
            />
          ) : (
            <div key={`empty-${idx}`} className="aspect-square" />
          ),
        )}
      </div>
    </div>
  );
}

interface DayCellProps {
  iso: string;
  day: AvailabilityDayView | undefined;
  isSelected: boolean;
  basePricePerNight: number;
  isPast: boolean;
  isToday: boolean;
  onClick: () => void;
}

function DayCell({
  iso,
  day,
  isSelected,
  basePricePerNight,
  isPast,
  isToday,
  onClick,
}: DayCellProps): React.JSX.Element {
  const isBlockedByBooking = day?.isBlockedByBooking ?? false;
  const isManuallyBlocked = day ? !day.isAvailable && !day.isBlockedByBooking : false;
  const price = day?.effectivePricePerNight ?? basePricePerNight;
  const hasOverride = (day?.priceOverride ?? null) !== null;
  const dayNumber = Number(iso.slice(-2));
  const interactive = !isPast;
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-pressed={isSelected}
      className={cn(
        'group relative flex aspect-square w-full flex-col items-stretch rounded-md border p-1 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        interactive ? 'cursor-pointer hover:border-primary/50' : 'cursor-default',
        isPast && 'opacity-40',
        isToday && 'ring-1 ring-primary/60',
        !day && 'border-border bg-card',
        isBlockedByBooking && 'border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/30',
        isManuallyBlocked && 'border-border bg-muted/70 text-muted-foreground',
        day?.isAvailable && hasOverride && 'border-primary/40 bg-primary/5',
        isSelected && 'border-primary bg-primary/15 ring-2 ring-primary',
      )}
    >
      <span className="text-[11px] font-semibold leading-none">{dayNumber}</span>
      <span className="mt-auto truncate text-[10px] font-medium">
        {isBlockedByBooking ? (
          <span className="text-amber-700 dark:text-amber-300">Booked</span>
        ) : isManuallyBlocked ? (
          <span className="text-muted-foreground">Closed</span>
        ) : (
          <span className={cn(hasOverride ? 'text-primary' : 'text-muted-foreground')}>
            {formatAmd(price)}
          </span>
        )}
      </span>
    </button>
  );
}
