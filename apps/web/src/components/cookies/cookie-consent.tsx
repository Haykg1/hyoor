'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/i18n/navigation';
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  readCookieConsentFromDocument,
  writeCookieConsent,
  type CookieConsentState,
} from '@/lib/cookies/consent';

export function CookieConsent(): React.JSX.Element | null {
  const t = useTranslations('cookies');
  const [consent, setConsent] = useState<CookieConsentState | null | undefined>(undefined);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [preferences, setPreferences] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  useEffect(() => {
    const current = readCookieConsentFromDocument();
    setConsent(current);
    if (current) {
      setPreferences(current.preferences);
      setAnalytics(current.analytics);
    }
  }, []);
  useEffect(() => {
    const onOpenSettings = (): void => {
      const current = readCookieConsentFromDocument();
      if (current) {
        setPreferences(current.preferences);
        setAnalytics(current.analytics);
      }
      setPrefsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);
  const persist = (next: { preferences: boolean; analytics: boolean }): void => {
    const state = writeCookieConsent(next);
    setConsent(state);
    setPreferences(state.preferences);
    setAnalytics(state.analytics);
    setPrefsOpen(false);
  };
  if (consent === undefined) {
    return null;
  }
  const showBanner = consent === null && !prefsOpen;
  return (
    <>
      {showBanner ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[200] border-t border-border bg-background/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/80"
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-body"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p id="cookie-consent-title" className="text-sm font-semibold text-foreground">
                {t('banner_title')}
              </p>
              <p id="cookie-consent-body" className="text-sm text-muted-foreground">
                {t.rich('banner_body', {
                  policy: (chunks) => (
                    <Link
                      href="/cookies"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>
                {t('customize')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => persist({ preferences: false, analytics: false })}
              >
                {t('necessary_only')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => persist({ preferences: true, analytics: true })}
              >
                {t('accept_all')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('preferences_title')}</DialogTitle>
            <DialogDescription>{t('preferences_intro')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('category_necessary_title')}</p>
                <p className="text-xs text-muted-foreground">{t('category_necessary_body')}</p>
              </div>
              <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                {t('always_on')}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('category_preferences_title')}</p>
                <p className="text-xs text-muted-foreground">{t('category_preferences_body')}</p>
              </div>
              <Switch
                checked={preferences}
                onCheckedChange={setPreferences}
                aria-label={t('category_preferences_title')}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('category_analytics_title')}</p>
                <p className="text-xs text-muted-foreground">{t('category_analytics_body')}</p>
              </div>
              <Switch
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label={t('category_analytics_title')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => persist({ preferences, analytics })}>
              {t('save_preferences')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
