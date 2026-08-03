import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { loadLegalDocHtml } from '@/lib/legal/load-legal-doc';
import { buildPageMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-static';

interface CancellationPageProps {
  params: { locale: Locale };
}

export async function generateMetadata({
  params: { locale },
}: CancellationPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'legal.cancellation' });
  return buildPageMetadata({
    locale,
    path: '/cancellation',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function CancellationPolicyPage({
  params: { locale },
}: CancellationPageProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const html = await loadLegalDocHtml('cancellation-refund-policy', locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <article className="legal-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
