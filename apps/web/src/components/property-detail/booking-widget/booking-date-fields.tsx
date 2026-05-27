import { useTranslations } from 'next-intl';

import { DateRangePicker } from '@/components/ui/date-range-picker';

interface BookingDateFieldsProps {
  checkIn: string;
  checkOut: string;
  checkInError?: string;
  checkOutError?: string;
  disabledDates?: Date[];
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
}

export function BookingDateFields({
  checkIn,
  checkOut,
  checkInError,
  checkOutError,
  disabledDates,
  onCheckInChange,
  onCheckOutChange,
}: BookingDateFieldsProps): React.JSX.Element {
  const t = useTranslations('booking');
  const error = checkInError ?? checkOutError;
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
