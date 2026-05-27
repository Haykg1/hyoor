'use client';

import { CancellationPolicies } from '@repo/shared';
import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { ListingFormValues } from '@/lib/listing/schema';
import { cn } from '@/lib/utils';

interface StepPricingProps {
  form: UseFormReturn<ListingFormValues>;
}

export function StepPricing({ form }: StepPricingProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.pricing');
  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pricePerNight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('price_per_night')} *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={t('price_placeholder')}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cleaningFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('cleaning_fee')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={t('cleaning_placeholder')}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="cancellationPolicy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('cancellation_policy')} *</FormLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {CancellationPolicies.map((policy) => (
                  <button
                    key={policy}
                    type="button"
                    onClick={() => field.onChange(policy)}
                    className={cn(
                      'rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors',
                      field.value === policy
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <span className="font-medium">{t(`policies.${policy}`)}</span>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}
