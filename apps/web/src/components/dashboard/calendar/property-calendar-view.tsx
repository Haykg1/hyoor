'use client';

import type { PropertyDetail } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { DisplayCurrencyToggle } from '@/components/currency/display-currency-toggle';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { useSelectionDates, usePropertyCalendar } from '@/hooks/use-property-calendar';
import { Link } from '@/i18n/navigation';
import { isLocalIsoEditable } from '@/lib/calendar/editable-window';
import { formatStoredMoney } from '@/lib/format/money';
import { usePropertyCalendarStore } from '@/store';

import { AvailabilityMonth } from './availability-month';
import { CalendarLegend } from './calendar-legend';
import { CalendarToolbar } from './calendar-toolbar';
import { HostCalendarAiPanel } from './host-calendar-ai-panel';
import { OpenYearDialog } from './open-year-dialog';
import { RangeRateDialog } from './range-rate-dialog';
import { SelectionEditor } from './selection-editor';

interface PropertyCalendarViewProps {
  property: PropertyDetail;
}

export function PropertyCalendarView({ property }: PropertyCalendarViewProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar');
  const locale = useLocale();
  const { displayCurrency, setDisplayCurrency, formatMoney, convert } = useDisplayMoney();
  usePropertyCalendar(property);
  const monthCursor = usePropertyCalendarStore((s) => s.monthCursor);
  const isLoading = usePropertyCalendarStore((s) => s.isLoading);
  const isSaving = usePropertyCalendarStore((s) => s.isSaving);
  const daysByDate = usePropertyCalendarStore((s) => s.daysByDate);
  const basePricePerNight = usePropertyCalendarStore((s) => s.basePricePerNight);
  const selection = usePropertyCalendarStore((s) => s.selection);
  const setSelection = usePropertyCalendarStore((s) => s.setSelection);
  const goPrev = usePropertyCalendarStore((s) => s.goToPreviousMonth);
  const goNext = usePropertyCalendarStore((s) => s.goToNextMonth);
  const goToday = usePropertyCalendarStore((s) => s.goToToday);

  const selectedDatesArray = useSelectionDates();
  const selectedDates = useMemo(() => new Set(selectedDatesArray), [selectedDatesArray]);

  const [openYearOpen, setOpenYearOpen] = useState(false);
  const [rangeRateOpen, setRangeRateOpen] = useState(false);

  const nextMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
  const localizedTitle = getLocalizedTitle(property.titleLabels, locale, property.title);

  function handleDayClick(iso: string): void {
    if (!isLocalIsoEditable(iso)) return;
    if (!selection.from || (selection.from && selection.to)) {
      setSelection({ from: iso, to: undefined });
      return;
    }
    if (iso < selection.from) {
      setSelection({ from: iso, to: selection.from });
      return;
    }
    setSelection({ from: selection.from, to: iso });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('back_to_dashboard')}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{localizedTitle}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <DisplayCurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} />
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('base_rate')}
              </p>
              <p className="text-lg font-semibold">
                {formatMoney(basePricePerNight, property.currency)}
                {convert(basePricePerNight, property.currency) !== null &&
                displayCurrency !== property.currency ? (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    (~{formatStoredMoney(basePricePerNight, property.currency)})
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </div>

      <CalendarToolbar
        monthCursor={monthCursor}
        isSaving={isSaving}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onOpenYear={() => setOpenYearOpen(true)}
        onSetRangeRate={() => setRangeRateOpen(true)}
      />

      <CalendarLegend />

      <div className="relative rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {isLoading && Object.keys(daysByDate).length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <AvailabilityMonth
              monthDate={monthCursor}
              daysByDate={daysByDate}
              selectedDates={selectedDates}
              basePricePerNight={basePricePerNight}
              currency={property.currency}
              onDayClick={handleDayClick}
            />
            <AvailabilityMonth
              monthDate={nextMonth}
              daysByDate={daysByDate}
              selectedDates={selectedDates}
              basePricePerNight={basePricePerNight}
              currency={property.currency}
              onDayClick={handleDayClick}
            />
          </div>
        )}
        {isLoading && Object.keys(daysByDate).length > 0 && (
          <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('refreshing')}
          </div>
        )}
      </div>

      <SelectionEditor basePricePerNight={basePricePerNight} />

      <HostCalendarAiPanel
        propertyId={property.id}
        propertyTitle={localizedTitle}
        currency={property.currency}
      />

      <OpenYearDialog open={openYearOpen} onOpenChange={setOpenYearOpen} />
      <RangeRateDialog open={rangeRateOpen} onOpenChange={setRangeRateOpen} />
    </div>
  );
}
