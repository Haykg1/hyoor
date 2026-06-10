import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { buildCompareMetadata, renderCompare } from '@/lib/compare/render';

interface ComparePageProps {
  params: { locale: Locale };
  searchParams: { left?: string; right?: string };
}

export const dynamic = 'force-dynamic';

function buildCanonicalPath(locale: string, leftId: string, rightId: string): string {
  const query = new URLSearchParams({ left: leftId, right: rightId }).toString();
  return `/${locale}/compare?${query}`;
}

export async function generateMetadata({
  params: { locale },
  searchParams,
}: ComparePageProps): Promise<Metadata> {
  const leftId = searchParams.left?.trim() ?? '';
  const rightId = searchParams.right?.trim() ?? '';
  return buildCompareMetadata(leftId, rightId, buildCanonicalPath(locale, leftId, rightId));
}

export default async function ComparePage({
  params: { locale },
  searchParams,
}: ComparePageProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const leftId = searchParams.left?.trim() ?? '';
  const rightId = searchParams.right?.trim() ?? '';
  return renderCompare(leftId, rightId);
}
