'use client';

import { CancellationPolicies } from '@repo/shared';
import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import type { ListingFormValues } from '@/lib/listing/schema';
import { cn } from '@/lib/utils';

interface StepPricingProps {
  form: UseFormReturn<ListingFormValues>;
}

export function StepPricing({ form }: StepPricingProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.pricing_rules');
  return (
    <Form {...form}>
      <div className="space-y-8">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold">{t('pricing_section')}</h3>
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
            <FormField
              control={form.control}
              name="securityDeposit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security_deposit')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t('deposit_placeholder')}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minNights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('min_nights')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxNights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('max_nights')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder={t('max_nights_placeholder')}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === '' ? undefined : Number(val));
                      }}
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
        <div className="space-y-6 border-t border-border pt-6">
          <h3 className="text-sm font-semibold">{t('rules_section')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="checkInTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('check_in_time')}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="checkOutTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('check_out_time')}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quietHoursStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quiet_hours_start')}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quietHoursEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quiet_hours_end')}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="smokingAllowed"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">{t('smoking_allowed')}</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="petsAllowed"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">{t('pets_allowed')}</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="partiesAllowed"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">{t('parties_allowed')}</FormLabel>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="additionalRules"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('additional_rules')}</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder={t('additional_rules_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-6 border-t border-border pt-6">
          <h3 className="text-sm font-semibold">{t('guest_instructions_section')}</h3>
          <p className="text-sm text-muted-foreground">{t('guest_instructions_hint')}</p>
          <FormField
            control={form.control}
            name="guestInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('guest_instructions')}</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('guest_instructions_placeholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
}
