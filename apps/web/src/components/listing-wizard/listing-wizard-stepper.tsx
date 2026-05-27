'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const STEPS = ['basics', 'details', 'media', 'pricing'] as const;

interface ListingWizardStepperProps {
  currentStep: number;
}

export function ListingWizardStepper({
  currentStep,
}: ListingWizardStepperProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.steps');
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {STEPS.map((key, index) => {
        const stepNum = index + 1;
        const isComplete = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  isComplete && 'bg-emerald-500 text-white',
                  isActive && 'bg-primary text-primary-foreground',
                  !isComplete && !isActive && 'bg-muted text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  'hidden text-xs sm:block',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {t(key)}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8 sm:w-16',
                  stepNum < currentStep ? 'bg-emerald-500' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
