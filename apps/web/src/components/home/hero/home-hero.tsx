import { useTranslations } from 'next-intl';

import { HeroQuickChips } from './hero-quick-chips';
import { HeroSearchForm } from './hero-search-form';

const HERO_BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&auto=format&fit=crop';

export function HomeHero(): React.JSX.Element {
  const t = useTranslations('home.hero');
  return (
    <section
      className="relative flex min-h-[580px] items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url("${HERO_BACKGROUND_IMAGE}")` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white">
        <p className="mb-3 inline-block rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
          🇦🇲 {t('badge')}
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
          {t('title')}
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-white/85">{t('subtitle')}</p>
        <HeroSearchForm />
        <HeroQuickChips />
      </div>
    </section>
  );
}
