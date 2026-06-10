import { getLocalizedTitle } from '@repo/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PropertyCompareInvalid } from '@/components/property-detail/property-compare-invalid';
import { PropertyCompareView } from '@/components/property-detail/property-compare-view';
import { getPropertyDetail } from '@/lib/api/properties';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';
import { formatAmd } from '@/lib/format/price';

type CompareInvalidReason = 'missing' | 'same' | 'not_found';

export async function renderCompare(leftId: string, rightId: string): Promise<React.JSX.Element> {
  if (!leftId || !rightId) {
    return <PropertyCompareInvalid reason="missing" />;
  }
  if (leftId === rightId) {
    return <PropertyCompareInvalid reason="same" />;
  }
  const [left, right] = await Promise.all([getPropertyDetail(leftId), getPropertyDetail(rightId)]);
  if (!left || !right) {
    return <PropertyCompareInvalid reason="not_found" />;
  }
  return <PropertyCompareView left={left} right={right} />;
}

export async function buildCompareMetadata(
  leftId: string,
  rightId: string,
  canonicalPath: string,
): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('property.compare');
  const fallback: Metadata = {
    title: t('page_title'),
    description: t('meta_description_fallback'),
  };
  if (!leftId || !rightId || leftId === rightId) {
    return fallback;
  }
  const [left, right] = await Promise.all([getPropertyDetail(leftId), getPropertyDetail(rightId)]);
  if (!left || !right) {
    return fallback;
  }
  const leftTitle = getLocalizedTitle(left.titleLabels, locale, left.title);
  const rightTitle = getLocalizedTitle(right.titleLabels, locale, right.title);
  const title = t('meta_title', { left: leftTitle, right: rightTitle });
  const description = t('meta_description', {
    left: leftTitle,
    right: rightTitle,
    leftPrice: formatAmd(left.pricePerNight),
    rightPrice: formatAmd(right.pricePerNight),
  });
  const images = [
    left.photos[0]?.url ?? PROPERTY_PLACEHOLDER_IMAGE,
    right.photos[0]?.url ?? PROPERTY_PLACEHOLDER_IMAGE,
  ];
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { title, description, type: 'website', url: canonicalPath, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export type { CompareInvalidReason };
