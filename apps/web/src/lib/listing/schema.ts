import {
  CancellationFeeTypes,
  CancellationPolicies,
  MAX_CANCELLATION_DEADLINE_DAYS,
  MAX_CANCELLATION_FEE_PERCENT,
  MAX_FEATURED_POIS,
  MIN_CANCELLATION_DEADLINE_DAYS,
  PropertyTypes,
  StayFeeDepositTypes,
  StayFeeRulesModes,
  buildSimpleCatchAllRule,
  validateStayFeeRules,
  type CreatePropertyInput,
  type StayFeeRuleInput,
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

const stayFeeRuleSchema = z.object({
  id: z.string().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  minNights: z.number().int().min(1),
  maxNights: z.number().int().min(1).nullable().optional(),
  cleaningFee: z.number().int().min(0),
  depositType: z.enum(StayFeeDepositTypes),
  depositValue: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
});

export const stepPricingRulesSchema = z
  .object({
    pricePerNight: z.number().int().min(0),
    stayFeeRulesMode: z.enum(StayFeeRulesModes),
    cleaningFee: z.number().int().min(0).optional(),
    securityDeposit: z.number().int().min(0).optional(),
    stayFeeRules: z.array(stayFeeRuleSchema).optional(),
    cancellationPolicy: z.enum(CancellationPolicies),
    cancellationFeeType: z.enum(CancellationFeeTypes).optional(),
    cancellationFeeValue: z.number().int().min(0).optional(),
    cancellationDeadlineDays: z
      .number()
      .int()
      .min(MIN_CANCELLATION_DEADLINE_DAYS)
      .max(MAX_CANCELLATION_DEADLINE_DAYS)
      .optional(),
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
  })
  .superRefine((data, ctx) => {
    if (data.cancellationPolicy !== 'NON_REFUNDABLE') {
      const feeType = data.cancellationFeeType ?? 'PERCENT';
      const feeValue = data.cancellationFeeValue ?? 0;
      if (feeType === 'PERCENT' && feeValue > MAX_CANCELLATION_FEE_PERCENT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cancellationFeeValue'],
          message: `Percent fee must be at most ${MAX_CANCELLATION_FEE_PERCENT}`,
        });
      }
      if (feeType === 'FIXED' && feeValue > data.pricePerNight) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cancellationFeeValue'],
          message: 'Fixed fee must not exceed the nightly price',
        });
      }
    }
    const rules: StayFeeRuleInput[] =
      data.stayFeeRulesMode === 'SIMPLE'
        ? [buildSimpleCatchAllRule(data.cleaningFee ?? 0, data.securityDeposit ?? 0)]
        : ((data.stayFeeRules ?? []) as StayFeeRuleInput[]);
    const feeError = validateStayFeeRules({
      mode: data.stayFeeRulesMode,
      rules,
      propertyMinNights: data.minNights ?? 1,
      propertyMaxNights: data.maxNights ?? null,
    });
    if (feeError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stayFeeRules'],
        message: feeError,
      });
    }
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
  stayFeeRulesMode: 'SIMPLE',
  cleaningFee: 0,
  securityDeposit: 0,
  stayFeeRules: [],
  cancellationPolicy: 'MODERATE',
  cancellationFeeType: 'PERCENT',
  cancellationFeeValue: 0,
  cancellationDeadlineDays: 0,
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
    currency: 'USD',
    stayFeeRulesMode: values.stayFeeRulesMode,
    ...(values.stayFeeRulesMode === 'SIMPLE'
      ? {
          cleaningFee: values.cleaningFee ?? 0,
          securityDeposit: values.securityDeposit ?? 0,
        }
      : {
          stayFeeRules: (values.stayFeeRules ?? []) as StayFeeRuleInput[],
        }),
    cancellationPolicy: values.cancellationPolicy,
    cancellationFeeType:
      values.cancellationPolicy === 'NON_REFUNDABLE'
        ? 'PERCENT'
        : (values.cancellationFeeType ?? 'PERCENT'),
    cancellationFeeValue:
      values.cancellationPolicy === 'NON_REFUNDABLE' ? 100 : (values.cancellationFeeValue ?? 0),
    cancellationDeadlineDays: values.cancellationDeadlineDays ?? 0,
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
