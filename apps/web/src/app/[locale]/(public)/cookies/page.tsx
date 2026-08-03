import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { loadLegalDocHtml } from '@/lib/legal/load-legal-doc';
import { buildPageMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-static';

interface CookiesPageProps {
  params: { locale: Locale };
}

export async function generateMetadata({
  params: { locale },
}: CookiesPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'legal.cookies' });
  return buildPageMetadata({
    locale,
    path: '/cookies',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function CookiePolicyPage({
  params: { locale },
}: CookiesPageProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const html = await loadLegalDocHtml('cookie-policy', locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <article className="legal-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
