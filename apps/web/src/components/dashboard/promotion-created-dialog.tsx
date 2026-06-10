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

interface PromotionCreatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestsNotified: number;
  notifyGuests: boolean;
}

export function PromotionCreatedDialog({
  open,
  onOpenChange,
  guestsNotified,
  notifyGuests,
}: PromotionCreatedDialogProps): React.JSX.Element {
  const t = useTranslations('dashboard.promotions.created_dialog');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {notifyGuests ? t('notified', { count: guestsNotified }) : t('not_notified')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
