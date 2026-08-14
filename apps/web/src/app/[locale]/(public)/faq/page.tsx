import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { FaqPage } from '@/components/faq/faq-page';
import type { Locale } from '@/i18n/routing';
import { ALL_FAQ_KEYS } from '@/lib/faq/catalog';
import { buildFaqPageJsonLd, getFaqI18nValues, stripFaqMarkup } from '@/lib/faq/json-ld';
import { buildPageMetadata } from '@/lib/seo/metadata';

interface FaqRouteProps {
  params: { locale: Locale };
}

export async function generateMetadata({ params: { locale } }: FaqRouteProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'faq' });
  const { siteName } = getFaqI18nValues();
  return buildPageMetadata({
    locale,
    path: '/faq',
    title: t('meta_title', { siteName }),
    description: t('meta_description', { siteName }),
  });
}

export default async function FaqRoute({
  params: { locale },
}: FaqRouteProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'faq' });
  const values = getFaqI18nValues();
  const jsonLd = buildFaqPageJsonLd(
    ALL_FAQ_KEYS.map((key) => ({
      question: t(`items.${key}.q`),
      answer: stripFaqMarkup(t(`items.${key}.a`, values)),
    })),
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqPage />
    </>
  );
}
