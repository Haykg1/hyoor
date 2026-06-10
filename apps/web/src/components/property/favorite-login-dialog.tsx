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

interface FavoriteLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoriteLoginDialog({
  open,
  onOpenChange,
}: FavoriteLoginDialogProps): React.JSX.Element {
  const t = useTranslations('favorites.login_modal');
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
          <Button asChild type="button">
            <Link href="/auth/login" onClick={() => onOpenChange(false)}>
              {t('sign_in')}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
