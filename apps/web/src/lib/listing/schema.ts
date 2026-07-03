import {
  CancellationPolicies,
  MAX_FEATURED_POIS,
  PropertyTypes,
  type CreatePropertyInput,
} from '@repo/shared';
import { z } from 'zod';

const stepBasicsFieldsSchema = z.object({
  propertyType: z.enum(PropertyTypes),
  title: z.string().min(1).max(200),
  titleEn: z.string().max(200).optional().or(z.literal('')),
  titleRu: z.string().max(200).optional().or(z.literal('')),
  titleHy: z.string().max(200).optional().or(z.literal('')),
  description: z.string().min(1).max(5000),
  city: z.string().min(1).max(100),
  region: z.string().max(100).optional().or(z.literal('')),
  street: z.string().min(1).max(200),
  buildingNumber: z.string().min(1).max(50),
  formattedAddress: z.string().max(500).optional().or(z.literal('')),
  placeKind: z.string().max(50).optional().or(z.literal('')),
  apartmentNumber: z.string().max(50).optional().or(z.literal('')),
  addressLine: z.string().max(300).optional().or(z.literal('')),
  country: z.string().min(2).max(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  featuredPoiIds: z.array(z.string().max(100)).max(MAX_FEATURED_POIS),
});

function validateBasicsAddress(
  data: z.infer<typeof stepBasicsFieldsSchema>,
  ctx: z.RefinementCtx,
): void {
  if (data.placeKind !== 'house') {
    ctx.addIssue({
      code: 'custom',
      message: 'address_verification_required',
      path: ['formattedAddress'],
    });
  }
  if (!data.buildingNumber.trim() || !data.street.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'address_verification_required',
      path: ['buildingNumber'],
    });
  }
  if (data.latitude === undefined || data.longitude === undefined) {
    ctx.addIssue({
      code: 'custom',
      message: 'address_verification_required',
      path: ['latitude'],
    });
  }
}

export const stepBasicsSchema = stepBasicsFieldsSchema.superRefine(validateBasicsAddress);

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

export const stepPricingRulesSchema = z.object({
  pricePerNight: z.number().int().min(0),
  cleaningFee: z.number().int().min(0).optional(),
  securityDeposit: z.number().int().min(0).optional(),
  cancellationPolicy: z.enum(CancellationPolicies),
  minNights: z.number().int().min(1).optional(),
  maxNights: z.number().int().min(1).optional(),
  checkInTime: z.string().max(5).optional().or(z.literal('')),
  checkOutTime: z.string().max(5).optional().or(z.literal('')),
  smokingAllowed: z.boolean().optional(),
  petsAllowed: z.boolean().optional(),
  partiesAllowed: z.boolean().optional(),
  quietHoursStart: z.string().max(5).optional().or(z.literal('')),
  quietHoursEnd: z.string().max(5).optional().or(z.literal('')),
  additionalRules: z.string().max(2000).optional().or(z.literal('')),
  guestInstructions: z.string().max(10000).optional().or(z.literal('')),
});

export const stepPricingSchema = stepPricingRulesSchema;

export const listingSchema = stepBasicsFieldsSchema
  .merge(stepDetailsSchema)
  .merge(stepMediaSchema)
  .merge(stepPricingRulesSchema)
  .superRefine((data, ctx) => validateBasicsAddress(data, ctx));

export type StepBasicsValues = z.infer<typeof stepBasicsSchema>;
export type StepDetailsValues = z.infer<typeof stepDetailsSchema>;
export type StepMediaValues = z.infer<typeof stepMediaSchema>;
export type StepPricingValues = z.infer<typeof stepPricingRulesSchema>;
export type ListingFormValues = z.infer<typeof listingSchema>;

/** Coerce API/session string decimals (Prisma Decimal JSON) to numbers for step 2. */
export function normalizeStepDetailsValues(values: ListingFormValues): ListingFormValues {
  return {
    ...values,
    bedrooms: Number(values.bedrooms),
    beds: Number(values.beds),
    bathrooms: Number(values.bathrooms),
    maxGuests: Number(values.maxGuests),
    maxAdults: Number(values.maxAdults),
    maxChildren: Number(values.maxChildren),
    maxInfants: Number(values.maxInfants),
  };
}

export const DEFAULT_LISTING_VALUES: ListingFormValues = {
  propertyType: 'APARTMENT',
  title: '',
  titleEn: '',
  titleRu: '',
  titleHy: '',
  description: '',
  city: '',
  region: '',
  street: '',
  buildingNumber: '',
  formattedAddress: '',
  placeKind: '',
  apartmentNumber: '',
  addressLine: '',
  country: 'AM',
  latitude: undefined,
  longitude: undefined,
  featuredPoiIds: [],
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
  securityDeposit: 0,
  cancellationPolicy: 'MODERATE',
  minNights: 1,
  checkInTime: '15:00',
  checkOutTime: '11:00',
  smokingAllowed: false,
  petsAllowed: false,
  partiesAllowed: false,
  quietHoursStart: '',
  quietHoursEnd: '',
  additionalRules: '',
  guestInstructions: '',
};

function optionalTime(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildTitleLabels(values: ListingFormValues): CreatePropertyInput['titleLabels'] {
  const labels: { en?: string; ru?: string; hy?: string } = {};
  const en = values.titleEn?.trim();
  const ru = values.titleRu?.trim();
  const hy = values.titleHy?.trim();
  if (en) labels.en = en;
  if (ru) labels.ru = ru;
  if (hy) labels.hy = hy;
  return Object.keys(labels).length > 0 ? labels : null;
}

export function toCreatePropertyInput(values: ListingFormValues): CreatePropertyInput {
  return {
    title: values.title,
    titleLabels: buildTitleLabels(values),
    description: values.description,
    propertyType: values.propertyType,
    city: values.city,
    country: values.country || 'AM',
    region: values.region || undefined,
    street: values.street,
    buildingNumber: values.buildingNumber,
    formattedAddress: values.formattedAddress || undefined,
    placeKind: values.placeKind || undefined,
    apartmentNumber: values.apartmentNumber || undefined,
    addressLine: values.addressLine || undefined,
    latitude: values.latitude,
    longitude: values.longitude,
    maxGuests: values.maxGuests,
    maxAdults: values.maxAdults,
    maxChildren: values.maxChildren,
    maxInfants: values.maxInfants,
    bedrooms: values.bedrooms,
    beds: values.beds,
    bathrooms: values.bathrooms,
    pricePerNight: values.pricePerNight,
    cleaningFee: values.cleaningFee ?? 0,
    securityDeposit: values.securityDeposit ?? 0,
    cancellationPolicy: values.cancellationPolicy,
    minNights: values.minNights ?? 1,
    maxNights: values.maxNights,
    checkInTime: optionalTime(values.checkInTime),
    checkOutTime: optionalTime(values.checkOutTime),
    smokingAllowed: values.smokingAllowed ?? false,
    petsAllowed: values.petsAllowed ?? false,
    partiesAllowed: values.partiesAllowed ?? false,
    quietHoursStart: optionalTime(values.quietHoursStart),
    quietHoursEnd: optionalTime(values.quietHoursEnd),
    additionalRules: optionalText(values.additionalRules),
    guestInstructions: optionalText(values.guestInstructions),
    featuredPoiIds: values.featuredPoiIds,
  };
}
