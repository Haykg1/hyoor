'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api';
import { createBooking } from '@/lib/api/bookings';

export interface BookingFormValues {
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface BookingFormErrors {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  submit?: string;
}

interface UseBookingFormOptions {
  propertyId: string;
  pricePerNight: number;
  cleaningFee: number | null;
  maxGuests: number;
  minNights: number;
  maxNights: number | null;
}

interface UseBookingFormReturn {
  values: BookingFormValues;
  errors: BookingFormErrors;
  isSubmitting: boolean;
  nights: number | null;
  subtotal: number | null;
  cleaningFee: number | null;
  total: number | null;
  canSubmit: boolean;
  setField: <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => void;
  submit: () => Promise<void>;
}

function countNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function parseApiErrorMessage(err: ApiError): string {
  try {
    const body = JSON.parse(err.body ?? '{}') as { message?: string };
    return body.message ?? err.message;
  } catch {
    return err.message;
  }
}

export function useBookingForm({
  propertyId,
  pricePerNight,
  cleaningFee,
  maxGuests,
  minNights,
  maxNights,
}: UseBookingFormOptions): UseBookingFormReturn {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('booking.validation');
  const tBooking = useTranslations('booking');

  const [values, setValues] = useState<BookingFormValues>({
    checkIn: '',
    checkOut: '',
    guests: 1,
  });
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(
    <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined, submit: undefined }));
    },
    [],
  );

  const nights = useMemo(() => {
    if (!values.checkIn || !values.checkOut) return null;
    const n = countNights(values.checkIn, values.checkOut);
    return n > 0 ? n : null;
  }, [values.checkIn, values.checkOut]);

  const subtotal = nights !== null ? nights * pricePerNight : null;
  const total = subtotal !== null ? subtotal + (cleaningFee ?? 0) : null;

  function validate(): BookingFormErrors {
    const errs: BookingFormErrors = {};
    if (!values.checkIn || !values.checkOut) {
      errs.checkIn = t('dates_required');
      return errs;
    }
    const n = countNights(values.checkIn, values.checkOut);
    if (n <= 0) {
      errs.checkOut = t('invalid_range');
      return errs;
    }
    if (n < minNights) {
      errs.checkOut = t('min_nights', { min: minNights });
      return errs;
    }
    if (maxNights !== null && n > maxNights) {
      errs.checkOut = t('max_nights', { max: maxNights });
      return errs;
    }
    if (values.guests < 1 || values.guests > maxGuests) {
      errs.guests = t('too_many_guests', { max: maxGuests });
    }
    return errs;
  }

  const canSubmit = useMemo(() => {
    if (!values.checkIn || !values.checkOut) return false;
    if (nights === null) return false;
    if (nights < minNights) return false;
    if (maxNights !== null && nights > maxNights) return false;
    if (values.guests < 1 || values.guests > maxGuests) return false;
    return true;
  }, [values, nights, minNights, maxNights, maxGuests]);

  const submit = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      const booking = await createBooking({
        propertyId,
        checkIn: values.checkIn,
        checkOut: values.checkOut,
        guestCount: values.guests,
      });
      router.push(`/${locale}/bookings/${booking.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          const next = encodeURIComponent(`/${locale}/property/${propertyId}`);
          router.push(`/${locale}/auth/login?next=${next}`);
          return;
        }
        if (err.status === 409) {
          const msg = tBooking('dates_unavailable');
          toast.error(msg);
          setErrors({ submit: msg });
          return;
        }
        const msg = parseApiErrorMessage(err);
        toast.error(msg);
        setErrors({ submit: msg });
        return;
      }
      const fallback = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(fallback);
      setErrors({ submit: fallback });
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, propertyId, locale, router]);

  return {
    values,
    errors,
    isSubmitting,
    nights,
    subtotal,
    cleaningFee,
    total,
    canSubmit,
    setField,
    submit,
  };
}
