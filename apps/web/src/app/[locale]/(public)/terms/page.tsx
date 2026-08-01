import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { loadLegalDocHtml } from '@/lib/legal/load-legal-doc';
import { buildPageMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-static';

interface TermsPageProps {
  params: { locale: Locale };
}

export async function generateMetadata({ params: { locale } }: TermsPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'legal.terms' });
  return buildPageMetadata({
    locale,
    path: '/terms',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function TermsPage({
  params: { locale },
}: TermsPageProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  const html = await loadLegalDocHtml('terms-of-service');
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="mb-8 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {t('english_only_note')}
      </p>
      <article className="legal-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
