'use client';

import type { AvailabilityDayView } from '@repo/shared';
import { CalendarRange, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDisplayMoney } from '@/hooks/use-display-money';
import { useBuildEntriesForSelection, useSelectionDates } from '@/hooks/use-property-calendar';
import { isLocalIsoEditable } from '@/lib/calendar/editable-window';
import { parseRateInput, toSettlementAmount } from '@/lib/calendar/rate-display';
import { formatCurrencyAmount } from '@/lib/format/price';
import { usePropertyCalendarStore } from '@/store';

interface SelectionEditorProps {
  basePricePerNight: number;
}

function formatRangeLabel(dates: string[]): string {
  if (dates.length === 0) return '';
  if (dates.length === 1) return dates[0]!;
  return `${dates[0]} → ${dates[dates.length - 1]}`;
}

function getInitialPriceForSelection(
  dates: string[],
  daysByDate: Record<string, AvailabilityDayView>,
  displayBase: number,
  toDisplay: (settlementAmount: number) => number,
): { value: string; useBase: boolean } {
  const overrides = dates
    .map((d) => daysByDate[d]?.priceOverride)
    .filter((v): v is number => typeof v === 'number');
  if (overrides.length === 0) return { value: String(displayBase), useBase: true };
  const allSame = overrides.every((v) => v === overrides[0]);
  if (!allSame) return { value: String(displayBase), useBase: false };
  return { value: String(toDisplay(overrides[0]!)), useBase: false };
}

export function SelectionEditor({ basePricePerNight }: SelectionEditorProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.editor');
  const selectionDates = useSelectionDates();
  const daysByDate = usePropertyCalendarStore((s) => s.daysByDate);
  const currency = usePropertyCalendarStore((s) => s.currency);
  const clearSelection = usePropertyCalendarStore((s) => s.clearSelection);
  const applyEntries = usePropertyCalendarStore((s) => s.applyEntries);
  const isSaving = usePropertyCalendarStore((s) => s.isSaving);
  const buildEntries = useBuildEntriesForSelection();
  const { displayCurrency, convert, formatMoney, rates } = useDisplayMoney();
  const convertedBase = convert(basePricePerNight, currency);
  const inputCurrency = convertedBase === null ? currency : displayCurrency;
  const displayBase = convertedBase ?? basePricePerNight;
  const showUsdApprox = convertedBase !== null && displayCurrency !== currency;

  const editableDates = selectionDates.filter(
    (d) => isLocalIsoEditable(d) && !daysByDate[d]?.isBlockedByBooking,
  );
  const lockedDates = selectionDates.filter((d) => daysByDate[d]?.isBlockedByBooking);

  const [useBase, setUseBase] = useState(true);
  const [priceText, setPriceText] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (selectionDates.length === 0) return;
    const initial = getInitialPriceForSelection(
      selectionDates,
      daysByDate,
      displayBase,
      (amount) => convert(amount, currency) ?? amount,
    );
    setUseBase(initial.useBase);
    setPriceText(initial.value);
    const allClosed = selectionDates.every(
      (d) => daysByDate[d] !== undefined && !daysByDate[d]!.isAvailable,
    );
    setIsAvailable(!allClosed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionDates.join(','), displayBase, displayCurrency]);

  if (selectionDates.length === 0) return <EmptyHint />;

  const typedDisplay = parseRateInput(useBase ? String(displayBase) : priceText);
  const settlementPreview =
    typedDisplay === null ? null : toSettlementAmount(typedDisplay, inputCurrency, currency, rates);

  async function handleApply(): Promise<void> {
    if (editableDates.length === 0) {
      toast.error(t('only_booked_selected'));
      return;
    }
    let priceMinor: number | null = null;
    if (!useBase) {
      const displayAmount = parseRateInput(priceText);
      if (displayAmount === null) {
        toast.error(t('invalid_price'));
        return;
      }
      priceMinor = toSettlementAmount(displayAmount, inputCurrency, currency, rates);
      if (priceMinor === null) {
        toast.error(t('invalid_price'));
        return;
      }
    }
    try {
      await applyEntries(buildEntries({ priceMinor, isAvailable }));
      toast.success(t('saved', { count: editableDates.length }));
      clearSelection();
    } catch {
      toast.error(t('save_failed'));
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarRange className="h-4 w-4 text-primary" />
          {t('editing_count', { count: selectionDates.length })}
          <span className="font-normal text-muted-foreground">
            ({formatRangeLabel(selectionDates)})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-3 w-3" />
          {t('clear')}
        </Button>
      </div>

      {lockedDates.length > 0 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          {t('skipped_booked', { count: lockedDates.length })}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="rate-input">{t('rate_label')}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="rate-input"
              type="text"
              inputMode="numeric"
              value={useBase ? String(displayBase) : priceText}
              disabled={useBase}
              onChange={(e) => setPriceText(e.target.value)}
              className="w-40"
            />
            <span className="text-xs text-muted-foreground">
              {inputCurrency}/{t('night')}
            </span>
            {showUsdApprox && settlementPreview !== null ? (
              <span className="text-xs text-muted-foreground">
                (~{formatCurrencyAmount(settlementPreview, currency)})
              </span>
            ) : null}
          </div>
          <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={useBase}
              onCheckedChange={(v) => setUseBase(Boolean(v))}
              aria-label={t('use_base_rate', {
                base: formatMoney(basePricePerNight, currency),
              })}
            />
            <span>
              {t('use_base_rate', { base: formatMoney(basePricePerNight, currency) })}
              {showUsdApprox ? (
                <span className="ml-1">
                  (~{formatCurrencyAmount(Math.round(basePricePerNight), currency)})
                </span>
              ) : null}
            </span>
          </label>
        </div>

        <div className="space-y-1.5">
          <Label>{t('status_label')}</Label>
          <div className="inline-flex h-9 items-center rounded-md border border-input p-1">
            <button
              type="button"
              onClick={() => setIsAvailable(true)}
              className={`rounded-sm px-3 py-1 text-xs font-medium ${
                isAvailable
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {t('available')}
            </button>
            <button
              type="button"
              onClick={() => setIsAvailable(false)}
              className={`rounded-sm px-3 py-1 text-xs font-medium ${
                !isAvailable
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {t('closed')}
            </button>
          </div>
        </div>

        <div className="flex items-end">
          <Button onClick={handleApply} disabled={isSaving || editableDates.length === 0}>
            {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {t('apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyHint(): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.editor');
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      {t('empty_hint')}
    </div>
  );
}
