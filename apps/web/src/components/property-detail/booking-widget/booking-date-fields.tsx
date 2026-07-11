import { useTranslations } from 'next-intl';

import { DateRangePicker } from '@/components/ui/date-range-picker';

interface BookingDateFieldsProps {
  checkIn: string;
  checkOut: string;
  checkInError?: string;
  checkOutError?: string;
  disabledDates?: Date[];
  minNights?: number;
  maxNights?: number | null;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
}

export function BookingDateFields({
  checkIn,
  checkOut,
  checkInError,
  checkOutError,
  disabledDates,
  minNights,
  maxNights,
  onCheckInChange,
  onCheckOutChange,
}: BookingDateFieldsProps): React.JSX.Element {
  const t = useTranslations('booking');
  const error = checkInError ?? checkOutError;
  const stayLengthHint =
    minNights && minNights > 1
      ? maxNights
        ? t('min_max_nights_hint', { min: minNights, max: maxNights })
        : t('min_nights_hint', { min: minNights })
      : maxNights
        ? t('max_nights_hint', { max: maxNights })
        : null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('check_in')} — {t('check_out')}
      </p>
      <div className="rounded-xl border border-input bg-background px-3 py-2.5">
        <DateRangePicker
          from={checkIn}
          to={checkOut}
          disabledDates={disabledDates}
          placeholder={t('select_dates')}
          numberOfMonths={1}
          align="start"
          onSelect={(from, to) => {
            onCheckInChange(from);
            onCheckOutChange(to);
          }}
          triggerClassName="text-sm"
        />
      </div>
      {stayLengthHint && !error && (
        <p className="text-xs text-muted-foreground">{stayLengthHint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
