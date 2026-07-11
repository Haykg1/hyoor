'use client';

import { ShieldAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const DISMISSED_STORAGE_KEY = 'rentstar:payment-safety-notice-dismissed';

export function PaymentSafetyNotice(): React.JSX.Element | null {
  const t = useTranslations('messaging');
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_STORAGE_KEY) === '1');
  }, []);

  function handleDismiss(): void {
    localStorage.setItem(DISMISSED_STORAGE_KEY, '1');
    setDismissed(true);
  }

  if (dismissed) {
    return null;
  }

  return (
    <Alert className="mx-4 mt-3 min-w-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
      <ShieldAlert />
      <div className="min-w-0 flex-1">
        <AlertTitle>{t('safety_notice_title')}</AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200/90">
          {t('safety_notice_body')}
        </AlertDescription>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-amber-700 hover:bg-amber-500/10 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        onClick={handleDismiss}
        aria-label={t('safety_notice_dismiss')}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
