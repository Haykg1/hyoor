'use client';

import { PropertyTypes, type PlaceResult } from '@repo/shared';
import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';

import { PropertyAddressAutocomplete } from '@/components/listing-wizard/property-address-autocomplete';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ListingFormValues } from '@/lib/listing/schema';
import { cn } from '@/lib/utils';

interface StepBasicsProps {
  form: UseFormReturn<ListingFormValues>;
}

export function StepBasics({ form }: StepBasicsProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.basics');

  function handlePlaceSelect(place: PlaceResult): void {
    const addressLine =
      place.street && place.buildingNumber
        ? `${place.street}, ${place.buildingNumber}`
        : place.formattedAddress;
    form.setValue('country', place.country || 'AM', { shouldValidate: true });
    form.setValue('region', place.region ?? '', { shouldValidate: true });
    form.setValue('city', place.city ?? '', { shouldValidate: true });
    form.setValue('street', place.street ?? '', { shouldValidate: true });
    form.setValue('buildingNumber', place.buildingNumber ?? '', { shouldValidate: true });
    form.setValue('formattedAddress', place.formattedAddress, { shouldValidate: true });
    form.setValue('placeKind', place.placeKind, { shouldValidate: true });
    form.setValue('addressLine', addressLine, { shouldValidate: true });
    form.setValue('latitude', place.lat, { shouldValidate: true });
    form.setValue('longitude', place.lng, { shouldValidate: true });
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="propertyType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('property_type')} *</FormLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PropertyTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => field.onChange(type)}
                    className={cn(
                      'rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors',
                      field.value === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    {t(`types.${type}`)}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('title')} *</FormLabel>
              <FormControl>
                <Input placeholder={t('title_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('description')} *</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder={t('description_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="formattedAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('address_search')} *</FormLabel>
              <FormControl>
                <PropertyAddressAutocomplete
                  value={field.value ?? ''}
                  onSelectPlace={handlePlaceSelect}
                />
              </FormControl>
              <FormMessage>
                {form.formState.errors.formattedAddress?.message === 'address_verification_required'
                  ? t('address_verification_required')
                  : form.formState.errors.formattedAddress?.message}
              </FormMessage>
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('city')} *</FormLabel>
                <FormControl>
                  <Input readOnly className="bg-muted" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('region')}</FormLabel>
                <FormControl>
                  <Input readOnly className="bg-muted" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('street')} *</FormLabel>
                <FormControl>
                  <Input readOnly className="bg-muted" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="buildingNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('building_number')} *</FormLabel>
                <FormControl>
                  <Input readOnly className="bg-muted" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="apartmentNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('apartment_number')}</FormLabel>
              <FormControl>
                <Input placeholder={t('apartment_number_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}
