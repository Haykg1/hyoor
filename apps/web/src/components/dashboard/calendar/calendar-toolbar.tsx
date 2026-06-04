'use client';

import { CalendarPlus, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

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

interface CalendarToolbarProps {
  monthCursor: Date;
  isSaving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenYear: () => void;
  onSetRangeRate: () => void;
}

export function CalendarToolbar({
  monthCursor,
  isSaving,
  onPrev,
  onNext,
  onToday,
  onOpenYear,
  onSetRangeRate,
}: CalendarToolbarProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar');
  const heading = `${MONTH_NAMES[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onPrev}
          aria-label={t('prev_month')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onNext}
          aria-label={t('next_month')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday}>
          {t('today')}
        </Button>
        <span className="ml-2 text-sm font-medium text-foreground">{heading}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onSetRangeRate} disabled={isSaving} className="gap-2">
          <CalendarRange className="h-4 w-4" />
          {t('set_range_rate')}
        </Button>
        <Button onClick={onOpenYear} disabled={isSaving} className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          {t('open_year')}
        </Button>
      </div>
    </div>
  );
}
