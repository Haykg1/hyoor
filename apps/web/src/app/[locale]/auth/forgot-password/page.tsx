import { Mail } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export default async function ForgotPasswordPage({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const t = await getTranslations('auth.forgot_password');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-1 font-bold text-xl mb-8">
          <span className="text-primary">Rent</span>
          <span className="text-foreground">Star</span>
        </Link>

        <div className="rounded-2xl border border-border p-8 space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
          </div>

          <ForgotPasswordForm />

          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              ← {t('back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
