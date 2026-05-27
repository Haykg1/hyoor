import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { OAuthCallbackHandler } from '@/components/auth/oauth-callback-handler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Locale } from '@/i18n/routing';

export default async function AuthCallbackPage({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const t = await getTranslations('auth.callback');
  return (
    <Card className="border-border shadow-card">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <OAuthCallbackHandler />
        </Suspense>
      </CardContent>
    </Card>
  );
}
