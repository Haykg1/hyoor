import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';

interface BookingGuestFieldProps {
  guests: number;
  maxGuests: number;
  error?: string;
  onChange: (value: number) => void;
}

export function BookingGuestField({
  guests,
  maxGuests,
  error,
  onChange,
}: BookingGuestFieldProps): React.JSX.Element {
  const t = useTranslations('booking');
  return (
    <div className="space-y-1">
      <Label htmlFor="booking-guests" className="text-xs font-medium uppercase tracking-wide">
        {t('guests')}
      </Label>
      <input
        id="booking-guests"
        type="number"
        min={1}
        max={maxGuests}
        value={guests}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <p className="text-xs text-muted-foreground">{t('guests_max', { max: maxGuests })}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
