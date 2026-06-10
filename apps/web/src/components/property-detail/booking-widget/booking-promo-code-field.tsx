import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BookingPromoCodeFieldProps {
  promoCode: string;
  error?: string;
  onChange: (value: string) => void;
}

export function BookingPromoCodeField({
  promoCode,
  error,
  onChange,
}: BookingPromoCodeFieldProps): React.JSX.Element {
  const t = useTranslations('booking');
  return (
    <div className="space-y-1.5">
      <Label htmlFor="booking-promo-code">{t('promo_code')}</Label>
      <Input
        id="booking-promo-code"
        value={promoCode}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={t('promo_code_placeholder')}
        autoComplete="off"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
