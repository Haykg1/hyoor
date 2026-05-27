import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface BookingSubmitButtonProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  onClick: () => void;
}

export function BookingSubmitButton({
  canSubmit,
  isSubmitting,
  onClick,
}: BookingSubmitButtonProps): React.JSX.Element {
  const t = useTranslations('booking');
  return (
    <Button className="w-full" disabled={!canSubmit || isSubmitting} onClick={onClick}>
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('submitting')}
        </>
      ) : (
        t('book_now')
      )}
    </Button>
  );
}
