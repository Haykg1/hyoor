import { setRequestLocale } from 'next-intl/server';

import { BecomeHostCta } from '@/components/home/become-host-cta';
import { FeaturedStays } from '@/components/home/featured-stays';
import { HomeHero } from '@/components/home/hero';
import { HotDeals } from '@/components/home/hot-deals';
import { HowItWorks } from '@/components/home/how-it-works';
import { PopularDestinations } from '@/components/home/popular-destinations';
import type { Locale } from '@/i18n/routing';
import { listHotDeals } from '@/lib/api/promotions';
import { listFeaturedProperties } from '@/lib/api/properties';

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<React.JSX.Element> {
  setRequestLocale(locale);
  const [featured, hotDeals] = await Promise.all([listFeaturedProperties(8), listHotDeals()]);
  return (
    <>
      <HomeHero />
      <HotDeals deals={hotDeals} />
      <FeaturedStays properties={featured} />
      <PopularDestinations />
      <HowItWorks />
      <BecomeHostCta />
    </>
  );
}
