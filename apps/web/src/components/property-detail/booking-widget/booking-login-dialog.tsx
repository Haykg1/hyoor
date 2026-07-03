'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';

interface BookingLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnPath: string;
}

export function BookingLoginDialog({
  open,
  onOpenChange,
  returnPath,
}: BookingLoginDialogProps): React.JSX.Element {
  const t = useTranslations('booking.login_modal');
  const tNav = useTranslations('nav');
  const next = encodeURIComponent(returnPath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="outline" asChild type="button">
            <Link href={`/auth/register?next=${next}`} onClick={() => onOpenChange(false)}>
              {tNav('sign_up')}
            </Link>
          </Button>
          <Button asChild type="button">
            <Link href={`/auth/login?next=${next}`} onClick={() => onOpenChange(false)}>
              {tNav('sign_in')}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
