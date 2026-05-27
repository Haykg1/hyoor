import { useTranslations } from 'next-intl';

import { popularDestinations } from '@/lib/mock-data/popular-destinations';

import { DestinationTile } from './destination-tile';

export function PopularDestinations(): React.JSX.Element {
  const t = useTranslations('home.destinations');
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{t('title')}</h2>
      <p className="mb-8 text-muted-foreground">{t('subtitle')}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {popularDestinations.map((destination) => (
          <DestinationTile key={destination.name} destination={destination} />
        ))}
      </div>
    </section>
  );
}
