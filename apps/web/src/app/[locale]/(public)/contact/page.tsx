import { COMPANY } from '@repo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ContactPage } from '@/components/contact/contact-page';
import type { Locale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/seo/metadata';

interface ContactRouteProps {
  params: { locale: Locale };
}

export async function generateMetadata({
  params: { locale },
}: ContactRouteProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'contact' });
  const siteName = COMPANY.websiteName;
  return buildPageMetadata({
    locale,
    path: '/contact',
    title: t('meta_title', { siteName }),
    description: t('meta_description', { siteName }),
  });
}

export default async function ContactRoute({
  params: { locale },
}: ContactRouteProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  return <ContactPage />;
}
