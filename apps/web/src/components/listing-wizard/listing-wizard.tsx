'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { PropertyDetail } from '@repo/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ListingWizardStepper } from '@/components/listing-wizard/listing-wizard-stepper';
import { StepBasics } from '@/components/listing-wizard/step-basics';
import { StepDetails } from '@/components/listing-wizard/step-details';
import { StepMediaAmenities } from '@/components/listing-wizard/step-media-amenities';
import { StepPricing } from '@/components/listing-wizard/step-pricing';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import {
  DEFAULT_LISTING_VALUES,
  listingSchema,
  normalizeStepDetailsValues,
  type ListingFormValues,
  stepBasicsSchema,
  stepDetailsSchema,
  stepPricingRulesSchema,
} from '@/lib/listing/schema';
import { useListingFormStore, type ListingWizardMode } from '@/store/listing-form.store';

const STEP_FIELDS: Record<number, (keyof ListingFormValues)[]> = {
  1: [
    'propertyType',
    'title',
    'description',
    'formattedAddress',
    'city',
    'region',
    'street',
    'buildingNumber',
    'placeKind',
    'latitude',
    'longitude',
    'country',
    'apartmentNumber',
  ],
  2: ['bedrooms', 'beds', 'bathrooms', 'maxGuests', 'maxAdults', 'maxChildren', 'maxInfants'],
  3: ['amenities'],
  4: [
    'pricePerNight',
    'cleaningFee',
    'securityDeposit',
    'cancellationPolicy',
    'minNights',
    'maxNights',
    'checkInTime',
    'checkOutTime',
    'smokingAllowed',
    'petsAllowed',
    'partiesAllowed',
    'quietHoursStart',
    'quietHoursEnd',
    'additionalRules',
  ],
};

interface ListingWizardProps {
  mode: ListingWizardMode;
  initialProperty?: PropertyDetail;
}

export function ListingWizard({ mode, initialProperty }: ListingWizardProps): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations('listing_wizard');
  const router = useRouter();
  const {
    step,
    data,
    photos,
    isSubmitting,
    error,
    hydrated,
    initCreate,
    hydrateFromProperty,
    goNext,
    goPrev,
    setData,
    addPendingPhotos,
    removePhoto,
    setCoverPhoto,
    updatePhotoCaption,
    movePhoto,
    submit,
    reset,
  } = useListingFormStore();
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: DEFAULT_LISTING_VALUES,
    values: data,
  });
  useEffect(() => {
    if (mode === 'create') {
      initCreate();
    } else if (initialProperty) {
      hydrateFromProperty(initialProperty, locale);
    }
    return () => {
      reset();
    };
  }, [mode, initialProperty, locale, initCreate, hydrateFromProperty, reset]);
  async function validateCurrentStep(): Promise<boolean> {
    const values = form.getValues();
    if (step === 1) {
      const result = stepBasicsSchema.safeParse(values);
      if (!result.success) {
        await form.trigger(STEP_FIELDS[1]);
        return false;
      }
      return true;
    }
    if (step === 2) {
      const normalized = normalizeStepDetailsValues(values);
      const result = stepDetailsSchema.safeParse(normalized);
      if (!result.success) {
        await form.trigger(STEP_FIELDS[2]);
        return false;
      }
      form.reset(normalized);
      return true;
    }
    if (step === 3) {
      return true;
    }
    if (step === 4) {
      const result = stepPricingRulesSchema.safeParse(values);
      if (!result.success) {
        await form.trigger(STEP_FIELDS[4]);
        return false;
      }
      if (values.pricePerNight < 1) {
        form.setError('pricePerNight', { message: t('pricing_rules.price_required') });
        return false;
      }
      return true;
    }
    return true;
  }
  async function handleNext() {
    const valid = await validateCurrentStep();
    if (!valid) return;
    setData(form.getValues());
    goNext();
  }
  async function handleSubmit() {
    const valid = await validateCurrentStep();
    if (!valid) return;
    setData(form.getValues());
    try {
      await submit();
      toast.success(mode === 'create' ? t('created_success') : t('updated_success'));
      router.push('/dashboard');
    } catch {
      toast.error(error ?? t('submit_error'));
    }
  }
  if (!hydrated && mode === 'edit') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        {t('loading')}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('back_dashboard')}
      </Link>
      <h1 className="mb-2 text-center text-2xl font-bold">{t('title')}</h1>
      <ListingWizardStepper currentStep={step} />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {step === 1 && <StepBasics form={form} />}
        {step === 2 && <StepDetails form={form} />}
        {step === 3 && (
          <StepMediaAmenities
            form={form}
            photos={photos}
            onAddPhotos={addPendingPhotos}
            onRemovePhoto={removePhoto}
            onSetCoverPhoto={setCoverPhoto}
            onUpdatePhotoCaption={updatePhotoCaption}
            onMovePhoto={movePhoto}
          />
        )}
        {step === 4 && <StepPricing form={form} />}
      </div>
      {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setData(form.getValues());
            goPrev();
          }}
          disabled={step === 1 || isSubmitting}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('back')}
        </Button>
        {step < 4 ? (
          <Button type="button" onClick={handleNext} disabled={isSubmitting}>
            {t('next')}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        )}
      </div>
    </div>
  );
}
