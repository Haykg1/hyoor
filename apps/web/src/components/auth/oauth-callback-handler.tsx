'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth.store';

export function OAuthCallbackHandler(): React.JSX.Element {
  const t = useTranslations('auth.callback');
  const router = useRouter();
  const params = useSearchParams();
  const setSessionFromTokens = useAuthStore((s) => s.setSessionFromTokens);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const errorParam = params.get('error');
    if (errorParam) {
      setError(t('error'));
      return;
    }
    if (!accessToken || !refreshToken) {
      setError(t('missing_tokens'));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await setSessionFromTokens({ accessToken, refreshToken });
        if (cancelled) {
          return;
        }
        const role = useAuthStore.getState().user?.role;
        const target =
          role === 'HOST' || role === 'ADMIN' || role === 'STAFF' ? '/dashboard' : '/trips';
        router.replace(target);
      } catch {
        if (!cancelled) {
          setError(t('error'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router, setSessionFromTokens, t]);

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/auth/login">{t('back_to_login')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t('processing')}</p>
    </div>
  );
}
