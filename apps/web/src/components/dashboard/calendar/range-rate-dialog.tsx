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

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
  const daysByDate = usePropertyCalendarStore((s) => s.daysByDate);
  const applyEntries = usePropertyCalendarStore((s) => s.applyEntries);
  const isSaving = usePropertyCalendarStore((s) => s.isSaving);

  const [range, setRange] = useState<DateRange | undefined>();
  const [useBase, setUseBase] = useState(true);
  const [priceText, setPriceText] = useState(String(basePricePerNight));
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (open) {
      setRange(undefined);
      setUseBase(true);
      setPriceText(String(basePricePerNight));
      setIsAvailable(true);
    }
  }, [open, basePricePerNight]);

  const fromDate = range?.from;
  const toDate = range?.to ?? range?.from;
  const dates = fromDate && toDate ? eachIsoInclusive(fromDate, toDate) : [];
  const editable = dates.filter((iso) => !daysByDate[iso]?.isBlockedByBooking);
  const locked = dates.length - editable.length;

  async function handleApply(): Promise<void> {
    if (editable.length === 0) {
      toast.error(t('pick_dates'));
      return;
    }
    const priceMinor = useBase ? null : Number(priceText.replace(/[^\d]/g, ''));
    if (!useBase && (!Number.isFinite(priceMinor) || priceMinor === null || priceMinor < 0)) {
      toast.error(t('invalid_price'));
      return;
    }
    try {
      await applyEntries(
        editable.map((iso) => {
          const entry: { date: string; isAvailable: boolean; priceOverride?: number } = {
            date: iso,
            isAvailable,
          };
          if (priceMinor !== null) entry.priceOverride = priceMinor;
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
              disabled={(date) => date < startOfToday()}
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
            <div className="flex items-center gap-2">
              <Input
                id="range-rate-input"
                type="text"
                inputMode="numeric"
                value={useBase ? String(basePricePerNight) : priceText}
                disabled={useBase}
                onChange={(e) => setPriceText(e.target.value)}
                className="w-40"
              />
              <span className="text-xs text-muted-foreground">AMD/{t('night')}</span>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={useBase}
                onCheckedChange={(v) => setUseBase(Boolean(v))}
                aria-label={t('use_base_rate', { base: basePricePerNight })}
              />
              {t('use_base_rate', { base: basePricePerNight })}
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
