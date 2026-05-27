import { Search, Shield, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HowItWorksStep } from './how-it-works-step';

type StepKey = 'search' | 'book' | 'enjoy';

interface StepConfig {
  key: StepKey;
  icon: LucideIcon;
  index: string;
}

const STEP_CONFIG: StepConfig[] = [
  { key: 'search', icon: Search, index: '01' },
  { key: 'book', icon: Shield, index: '02' },
  { key: 'enjoy', icon: Star, index: '03' },
];

export function HowItWorks(): React.JSX.Element {
  const t = useTranslations('home.how_it_works');
  return (
    <section className="bg-secondary py-16">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{t('title')}</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEP_CONFIG.map((step) => (
            <HowItWorksStep
              key={step.key}
              icon={step.icon}
              index={step.index}
              title={t(`steps.${step.key}.title`)}
              description={t(`steps.${step.key}.description`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
