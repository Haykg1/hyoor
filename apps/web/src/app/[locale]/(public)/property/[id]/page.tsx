import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { PropertyDetailView } from '@/components/property-detail';
import type { Locale } from '@/i18n/routing';
import { getPropertyDetail } from '@/lib/api/properties';
import { listPropertyReviews } from '@/lib/api/reviews';

interface PropertyPageProps {
  params: { locale: Locale; id: string };
}

export const dynamic = 'force-dynamic';

export default async function PropertyPage({
  params: { locale, id },
}: PropertyPageProps): Promise<React.JSX.Element> {
  setRequestLocale(locale);

  const [property, reviewsPage] = await Promise.all([
    getPropertyDetail(id),
    listPropertyReviews(id, { limit: 10, page: 1 }),
  ]);

  if (!property) notFound();

  return <PropertyDetailView property={property} initialReviews={reviewsPage.data} />;
}
