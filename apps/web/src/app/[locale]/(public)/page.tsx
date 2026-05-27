import { setRequestLocale } from 'next-intl/server';

import { BecomeHostCta } from '@/components/home/become-host-cta';
import { FeaturedStays } from '@/components/home/featured-stays';
import { HomeHero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { PopularDestinations } from '@/components/home/popular-destinations';
import type { Locale } from '@/i18n/routing';
import { listFeaturedProperties } from '@/lib/api/properties';

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const featured = await listFeaturedProperties(8);
  return (
    <>
      <HomeHero />
      <FeaturedStays properties={featured} />
      <PopularDestinations />
      <HowItWorks />
      <BecomeHostCta />
    </>
  );
}
