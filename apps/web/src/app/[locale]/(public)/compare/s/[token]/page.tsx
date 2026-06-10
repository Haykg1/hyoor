import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PropertyCompareInvalid } from '@/components/property-detail/property-compare-invalid';
import type { Locale } from '@/i18n/routing';
import { resolveCompareShareLink } from '@/lib/api/compare-share';
import { buildCompareMetadata, renderCompare } from '@/lib/compare/render';

interface CompareSharePageProps {
  params: { locale: Locale; token: string };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale, token },
}: CompareSharePageProps): Promise<Metadata> {
  const shared = await resolveCompareShareLink(token);
  if (!shared) {
    const t = await getTranslations('property.compare');
    return { title: t('page_title'), description: t('meta_description_fallback') };
  }
  return buildCompareMetadata(
    shared.leftId,
    shared.rightId,
    `/${locale}/compare/s/${encodeURIComponent(token)}`,
  );
}

export default async function CompareSharePage({
  params: { locale, token },
}: CompareSharePageProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const shared = await resolveCompareShareLink(token);
  if (!shared) {
    return <PropertyCompareInvalid reason="expired" />;
  }
  return renderCompare(shared.leftId, shared.rightId);
}
