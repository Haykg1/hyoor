import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export function BecomeHostCta(): React.JSX.Element {
  const t = useTranslations('home.become_host');
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground sm:flex-row sm:p-12">
        <div>
          <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{t('title')}</h2>
          <p className="max-w-md text-primary-foreground/80">{t('description')}</p>
        </div>
        <Link
          href="/host/onboarding"
          className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-8 py-3 text-base font-bold text-primary shadow transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('cta')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
