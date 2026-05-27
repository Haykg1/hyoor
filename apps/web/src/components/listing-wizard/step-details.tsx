'use client';

import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';

import { CounterInput } from '@/components/listing-wizard/counter-input';
import { Form } from '@/components/ui/form';
import type { ListingFormValues } from '@/lib/listing/schema';

interface StepDetailsProps {
  form: UseFormReturn<ListingFormValues>;
}

export function StepDetails({ form }: StepDetailsProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.details');
  const values = form.watch();
  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <CounterInput
            label={t('bedrooms')}
            value={values.bedrooms}
            min={0}
            onChange={(v) => form.setValue('bedrooms', v, { shouldValidate: true })}
          />
          <CounterInput
            label={t('beds')}
            value={values.beds}
            min={1}
            onChange={(v) => form.setValue('beds', v, { shouldValidate: true })}
          />
          <CounterInput
            label={t('bathrooms')}
            value={values.bathrooms}
            min={0}
            step={0.5}
            onChange={(v) => form.setValue('bathrooms', v, { shouldValidate: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <CounterInput
            label={t('max_guests')}
            value={values.maxGuests}
            min={1}
            onChange={(v) => form.setValue('maxGuests', v, { shouldValidate: true })}
          />
          <CounterInput
            label={t('max_adults')}
            value={values.maxAdults}
            min={0}
            onChange={(v) => form.setValue('maxAdults', v, { shouldValidate: true })}
          />
          <CounterInput
            label={t('max_children')}
            value={values.maxChildren}
            min={0}
            onChange={(v) => form.setValue('maxChildren', v, { shouldValidate: true })}
          />
          <CounterInput
            label={t('max_infants')}
            value={values.maxInfants}
            min={0}
            onChange={(v) => form.setValue('maxInfants', v, { shouldValidate: true })}
          />
        </div>
      </div>
    </Form>
  );
}
