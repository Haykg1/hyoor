'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePropertyCalendarStore } from '@/store';

interface OpenYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenYearDialog({ open, onOpenChange }: OpenYearDialogProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.open_year_dialog');
  const openYear = usePropertyCalendarStore((s) => s.openYear);
  const isSaving = usePropertyCalendarStore((s) => s.isSaving);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    try {
      const result = await openYear();
      if (result) {
        toast.success(
          t('toast_success', {
            opened: result.openedCount,
            skipped: result.skippedBookedCount,
          }),
        );
      }
      onOpenChange(false);
    } catch {
      toast.error(t('toast_error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || isSaving}
          >
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || isSaving}>
            {submitting || isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
