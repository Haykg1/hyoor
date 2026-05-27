import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthDivider } from '@/components/auth/auth-divider';
import { AuthSplitPanel, MobileBrandLink } from '@/components/auth/auth-split-panel';
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button';
import { LoginForm } from '@/components/auth/login-form';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { redirectIfAuthenticated } from '@/lib/auth';

export default async function LoginPage({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  await redirectIfAuthenticated(locale);
  const t = await getTranslations('auth.login');

  return (
    <div className="min-h-screen flex">
      <AuthSplitPanel
        imageUrl="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&auto=format&fit=crop"
        quote="Discover the best places to stay across Armenia."
        subtext="Thousands of verified listings waiting for you."
      />

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          <MobileBrandLink />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>

          <GoogleOAuthButton />

          <AuthDivider />

          <LoginForm />

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('no_account')}{' '}
            <Link href="/auth/register" className="text-primary font-semibold hover:underline">
              {t('go_to_register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
