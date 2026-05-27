import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthDivider } from '@/components/auth/auth-divider';
import { AuthSplitPanel, MobileBrandLink } from '@/components/auth/auth-split-panel';
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button';
import { RegisterForm } from '@/components/auth/register-form';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { redirectIfAuthenticated } from '@/lib/auth';

export default async function RegisterPage({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  await redirectIfAuthenticated(locale);
  const t = await getTranslations('auth.register');

  return (
    <div className="min-h-screen flex">
      <AuthSplitPanel
        imageUrl="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop"
        quote="Join thousands of hosts and guests across Armenia."
        subtext="List your property or find your perfect stay."
      />

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          <MobileBrandLink />

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>

          <RegisterForm />

          <AuthDivider />

          <GoogleOAuthButton />

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('have_account')}{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              {t('go_to_login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
