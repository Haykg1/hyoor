import { CancellationPolicies, PropertyTypes, type CreatePropertyInput } from '@repo/shared';
import { z } from 'zod';

export const stepBasicsSchema = z.object({
  propertyType: z.enum(PropertyTypes),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  city: z.string().min(1).max(100),
  region: z.string().max(100).optional().or(z.literal('')),
  addressLine: z.string().max(300).optional().or(z.literal('')),
  country: z.string().max(2).optional(),
});

export const stepDetailsSchema = z.object({
  bedrooms: z.number().int().min(0),
  beds: z.number().int().min(1),
  bathrooms: z.number().min(0),
  maxGuests: z.number().int().min(1),
  maxAdults: z.number().int().min(0),
  maxChildren: z.number().int().min(0),
  maxInfants: z.number().int().min(0),
});

export const stepMediaSchema = z.object({
  amenities: z.array(
    z.object({
      name: z.string().min(1).max(100),
      category: z.string().max(50).optional(),
      iconKey: z.string().max(200).optional(),
    }),
  ),
});

export const stepPricingSchema = z.object({
  pricePerNight: z.number().int().min(0),
  cleaningFee: z.number().int().min(0).optional(),
  cancellationPolicy: z.enum(CancellationPolicies),
  minNights: z.number().int().min(1).optional(),
  maxNights: z.number().int().min(1).optional(),
});

export const listingSchema = stepBasicsSchema
  .merge(stepDetailsSchema)
  .merge(stepMediaSchema)
  .merge(stepPricingSchema);

export type StepBasicsValues = z.infer<typeof stepBasicsSchema>;
export type StepDetailsValues = z.infer<typeof stepDetailsSchema>;
export type StepMediaValues = z.infer<typeof stepMediaSchema>;
export type StepPricingValues = z.infer<typeof stepPricingSchema>;
export type ListingFormValues = z.infer<typeof listingSchema>;

export const DEFAULT_LISTING_VALUES: ListingFormValues = {
  propertyType: 'APARTMENT',
  title: '',
  description: '',
  city: '',
  region: '',
  addressLine: '',
  country: 'AM',
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  maxGuests: 2,
  maxAdults: 2,
  maxChildren: 0,
  maxInfants: 0,
  amenities: [],
  pricePerNight: 0,
  cleaningFee: 0,
  cancellationPolicy: 'MODERATE',
  minNights: 1,
};

export function toCreatePropertyInput(values: ListingFormValues): CreatePropertyInput {
  return {
    title: values.title,
    description: values.description,
    propertyType: values.propertyType,
    city: values.city,
    country: values.country || 'AM',
    region: values.region || undefined,
    addressLine: values.addressLine || undefined,
    maxGuests: values.maxGuests,
    maxAdults: values.maxAdults,
    maxChildren: values.maxChildren,
    maxInfants: values.maxInfants,
    bedrooms: values.bedrooms,
    beds: values.beds,
    bathrooms: values.bathrooms,
    pricePerNight: values.pricePerNight,
    cleaningFee: values.cleaningFee ?? 0,
    cancellationPolicy: values.cancellationPolicy,
    minNights: values.minNights ?? 1,
    maxNights: values.maxNights,
  };
}
