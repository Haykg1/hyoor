'use client';

import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getMyHostProfile,
  getStripeLoginLink,
  getStripeOnboardingLink,
  refreshStripeStatus,
  type MyHostProfile,
} from '@/lib/api/host-profiles';
import { cn } from '@/lib/utils';

interface PayoutsPanelProps {
  /** Actively re-syncs Stripe status instead of reading the cached DB flags — use right after onboarding return, since the `account.updated` webhook may lag. */
  autoSync?: boolean;
}

export function PayoutsPanel({ autoSync = false }: PayoutsPanelProps): React.JSX.Element {
  const t = useTranslations('account.payouts');
  const [profile, setProfile] = useState<MyHostProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = autoSync ? refreshStripeStatus : getMyHostProfile;
    fetchProfile()
      .then(setProfile)
      .catch(() => setError(t('error')))
      .finally(() => setIsLoading(false));
  }, [t, autoSync]);

  const handleSetup = async (): Promise<void> => {
    setIsRedirecting(true);
    try {
      const { onboardingUrl } = await getStripeOnboardingLink();
      window.location.href = onboardingUrl;
    } catch {
      setError(t('error'));
      setIsRedirecting(false);
    }
  };

  const handleOpenDashboard = async (): Promise<void> => {
    setIsRedirecting(true);
    try {
      const { loginUrl } = await getStripeLoginLink();
      window.location.href = loginUrl;
    } catch {
      setError(t('error'));
      setIsRedirecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-emerald-600" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  profile?.stripePayoutsEnabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : profile?.stripeAccountId
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {profile?.stripePayoutsEnabled
                  ? t('status_ready')
                  : profile?.stripeAccountId
                    ? t('status_action_needed')
                    : t('status_not_started')}
              </span>
            </div>
            <Button
              onClick={() =>
                void (profile?.stripePayoutsEnabled ? handleOpenDashboard() : handleSetup())
              }
              disabled={isRedirecting}
              className="rounded-xl"
            >
              {isRedirecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              {profile?.stripePayoutsEnabled
                ? t('open_dashboard')
                : profile?.stripeAccountId
                  ? t('continue_setup')
                  : t('start_setup')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
