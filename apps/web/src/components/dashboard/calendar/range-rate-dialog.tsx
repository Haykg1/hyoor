'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDisplayMoney } from '@/hooks/use-display-money';
import {
  endOfEditableLocalDay,
  isLocalIsoEditable,
  startOfLocalToday,
} from '@/lib/calendar/editable-window';
import { parseRateInput, toSettlementAmount } from '@/lib/calendar/rate-display';
import { formatCurrencyAmount } from '@/lib/format/price';
import { usePropertyCalendarStore } from '@/store';

interface RangeRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function eachIsoInclusive(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    out.push(toIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function RangeRateDialog({ open, onOpenChange }: RangeRateDialogProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.range_dialog');
  const basePricePerNight = usePropertyCalendarStore((s) => s.basePricePerNight);
  const currency = usePropertyCalendarStore((s) => s.currency);
  const daysByDate = usePropertyCalendarStore((s) => s.daysByDate);
  const applyEntries = usePropertyCalendarStore((s) => s.applyEntries);
  const isSaving = usePropertyCalendarStore((s) => s.isSaving);
  const { displayCurrency, convert, formatMoney, rates } = useDisplayMoney();
  const convertedBase = convert(basePricePerNight, currency);
  const inputCurrency = convertedBase === null ? currency : displayCurrency;
  const displayBase = convertedBase ?? basePricePerNight;
  const showUsdApprox = convertedBase !== null && displayCurrency !== currency;

  const [range, setRange] = useState<DateRange | undefined>();
  const [useBase, setUseBase] = useState(true);
  const [priceText, setPriceText] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!open) return;
    setRange(undefined);
    setUseBase(true);
    setPriceText(String(displayBase));
    setIsAvailable(true);
  }, [open, displayBase]);

  const fromDate = range?.from;
  const toDate = range?.to ?? range?.from;
  const dates = fromDate && toDate ? eachIsoInclusive(fromDate, toDate) : [];
  const editable = dates.filter(
    (iso) => isLocalIsoEditable(iso) && !daysByDate[iso]?.isBlockedByBooking,
  );
  const locked = dates.length - editable.length;
  const typedDisplay = parseRateInput(useBase ? String(displayBase) : priceText);
  const settlementPreview =
    typedDisplay === null ? null : toSettlementAmount(typedDisplay, inputCurrency, currency, rates);

  async function handleApply(): Promise<void> {
    if (editable.length === 0) {
      toast.error(t('pick_dates'));
      return;
    }
    let priceSettlement: number | null = null;
    if (!useBase) {
      const displayAmount = parseRateInput(priceText);
      if (displayAmount === null) {
        toast.error(t('invalid_price'));
        return;
      }
      priceSettlement = toSettlementAmount(displayAmount, inputCurrency, currency, rates);
      if (priceSettlement === null) {
        toast.error(t('invalid_price'));
        return;
      }
    }
    try {
      await applyEntries(
        editable.map((iso) => {
          const entry: { date: string; isAvailable: boolean; priceOverride?: number } = {
            date: iso,
            isAvailable,
          };
          if (priceSettlement !== null) entry.priceOverride = priceSettlement;
          return entry;
        }),
      );
      toast.success(t('saved', { count: editable.length }));
      onOpenChange(false);
    } catch {
      toast.error(t('save_failed'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              disabled={(date) => {
                const start = startOfLocalToday();
                const end = endOfEditableLocalDay();
                return date < start || date > end;
              }}
            />
          </div>

          {dates.length > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {t('selected_summary', { count: dates.length })}
              {locked > 0 ? ` · ${t('skipped_booked', { count: locked })}` : ''}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="range-rate-input">{t('rate_label')}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="range-rate-input"
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
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
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

          <div className="space-y-2">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('cancel')}
          </Button>
          <Button onClick={handleApply} disabled={isSaving || editable.length === 0}>
            {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {t('apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
