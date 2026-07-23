'use client';

import {
  CancellationFeeTypes,
  CancellationPolicies,
  MAX_CANCELLATION_FEE_PERCENT,
  type StayFeeRuleInput,
  type StayFeeRulesMode,
} from '@repo/shared';
import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';

import { StayFeeRulesEditor } from '@/components/listing-wizard/stay-fee-rules-editor';
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
import { MoneyInput } from '@/components/ui/money-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ListingFormValues } from '@/lib/listing/schema';
import { cn } from '@/lib/utils';

interface StepPricingProps {
  form: UseFormReturn<ListingFormValues>;
}

const LISTING_CURRENCY = 'USD';

export function StepPricing({ form }: StepPricingProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.pricing_rules');
  const mode = form.watch('stayFeeRulesMode') ?? 'SIMPLE';
  const cleaningFee = form.watch('cleaningFee') ?? 0;
  const securityDeposit = form.watch('securityDeposit') ?? 0;
  const stayFeeRules = (form.watch('stayFeeRules') ?? []) as StayFeeRuleInput[];
  const minNights = form.watch('minNights') ?? 1;
  const maxNights = form.watch('maxNights') ?? null;
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
                    <MoneyInput
                      currency={LISTING_CURRENCY}
                      placeholder={t('price_placeholder')}
                      value={field.value ?? 0}
                      onValueChange={field.onChange}
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
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('stay_fees_section')}</h4>
            <StayFeeRulesEditor
              mode={mode}
              rules={stayFeeRules}
              cleaningFee={cleaningFee}
              securityDeposit={securityDeposit}
              currency={LISTING_CURRENCY}
              propertyMinNights={minNights}
              propertyMaxNights={maxNights}
              onModeChange={(next: StayFeeRulesMode) =>
                form.setValue('stayFeeRulesMode', next, { shouldDirty: true, shouldValidate: true })
              }
              onCleaningFeeChange={(value) =>
                form.setValue('cleaningFee', value, { shouldDirty: true, shouldValidate: true })
              }
              onSecurityDepositChange={(value) =>
                form.setValue('securityDeposit', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              onRulesChange={(rules) =>
                form.setValue('stayFeeRules', rules, { shouldDirty: true, shouldValidate: true })
              }
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="cancellationFeeType"
              render={({ field }) => {
                const isNonRefundable = form.watch('cancellationPolicy') === 'NON_REFUNDABLE';
                return (
                  <FormItem>
                    <FormLabel>{t('cancellation_fee_type')}</FormLabel>
                    <Select
                      disabled={isNonRefundable}
                      value={isNonRefundable ? 'PERCENT' : (field.value ?? 'PERCENT')}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CancellationFeeTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`fee_types.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="cancellationFeeValue"
              render={({ field }) => {
                const isNonRefundable = form.watch('cancellationPolicy') === 'NON_REFUNDABLE';
                const feeType = form.watch('cancellationFeeType') ?? 'PERCENT';
                const pricePerNight = form.watch('pricePerNight') ?? 0;
                const maxValue =
                  feeType === 'PERCENT' ? MAX_CANCELLATION_FEE_PERCENT : pricePerNight;
                return (
                  <FormItem>
                    <FormLabel>
                      {feeType === 'FIXED'
                        ? t('cancellation_fee_fixed')
                        : t('cancellation_fee_percent')}
                    </FormLabel>
                    <FormControl>
                      {feeType === 'FIXED' && !isNonRefundable ? (
                        <MoneyInput
                          currency={LISTING_CURRENCY}
                          value={field.value ?? 0}
                          onValueChange={(minor) => field.onChange(Math.min(maxValue, minor))}
                        />
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          max={isNonRefundable ? 100 : maxValue}
                          disabled={isNonRefundable}
                          value={isNonRefundable ? 100 : (field.value ?? 0)}
                          onChange={(e) => {
                            const next = Math.max(0, Number(e.target.value) || 0);
                            field.onChange(Math.min(isNonRefundable ? 100 : maxValue, next));
                          }}
                        />
                      )}
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {isNonRefundable
                        ? t('cancellation_fee_non_refundable_hint')
                        : feeType === 'FIXED'
                          ? t('cancellation_fee_fixed_hint')
                          : t('cancellation_fee_percent_hint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
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
