'use client';

import type { BookingQuoteResult } from '@repo/shared';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api';
import { createBooking, getBookingQuote } from '@/lib/api/bookings';

const QUOTE_DEBOUNCE_MS = 300;

export interface BookingFormValues {
  checkIn: string;
  checkOut: string;
  guests: number;
  promoCode: string;
}

export interface BookingFormErrors {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  promoCode?: string;
  submit?: string;
}

interface UseBookingFormOptions {
  propertyId: string;
  maxGuests: number;
  minNights: number;
  maxNights: number | null;
}

interface UseBookingFormReturn {
  values: BookingFormValues;
  errors: BookingFormErrors;
  isSubmitting: boolean;
  isQuoteLoading: boolean;
  isConfirmOpen: boolean;
  quote: BookingQuoteResult | null;
  nights: number | null;
  canSubmit: boolean;
  setField: <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => void;
  setConfirmOpen: (open: boolean) => void;
  openConfirmDialog: () => void;
  confirmBooking: () => Promise<void>;
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
    promoCode: '',
  });
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [quote, setQuote] = useState<BookingQuoteResult | null>(null);

  const setField = useCallback(
    <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({
        ...prev,
        [key]: undefined,
        submit: undefined,
        ...(key === 'promoCode' ? { promoCode: undefined } : {}),
      }));
    },
    [],
  );

  const nights = useMemo(() => {
    if (!values.checkIn || !values.checkOut) return null;
    const n = countNights(values.checkIn, values.checkOut);
    return n > 0 ? n : null;
  }, [values.checkIn, values.checkOut]);

  const dateValidationErrors = useMemo((): BookingFormErrors => {
    const errs: BookingFormErrors = {};
    if (!values.checkIn || !values.checkOut) {
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
  }, [values, minNights, maxNights, maxGuests, t]);

  useEffect(() => {
    if (!values.checkIn || !values.checkOut || Object.keys(dateValidationErrors).length > 0) {
      setQuote(null);
      setIsQuoteLoading(false);
      return;
    }
    setIsQuoteLoading(true);
    const timer = setTimeout(() => {
      void getBookingQuote({
        propertyId,
        checkIn: values.checkIn,
        checkOut: values.checkOut,
        promoCode: values.promoCode || undefined,
      })
        .then((result) => {
          setQuote(result);
          setErrors((prev) => ({
            ...prev,
            promoCode: result.promoCodeError ? tBooking('promo_code_invalid') : undefined,
          }));
        })
        .catch(() => {
          setQuote(null);
        })
        .finally(() => {
          setIsQuoteLoading(false);
        });
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    propertyId,
    values.checkIn,
    values.checkOut,
    values.promoCode,
    dateValidationErrors,
    tBooking,
  ]);

  const canSubmit = useMemo(() => {
    if (!values.checkIn || !values.checkOut) return false;
    if (nights === null) return false;
    if (Object.keys(dateValidationErrors).length > 0) return false;
    if (isQuoteLoading || !quote) return false;
    if (quote.promoCodeError && values.promoCode.trim()) return false;
    return true;
  }, [values, nights, dateValidationErrors, isQuoteLoading, quote]);

  function validate(): BookingFormErrors {
    const errs: BookingFormErrors = {};
    if (!values.checkIn || !values.checkOut) {
      errs.checkIn = t('dates_required');
      return errs;
    }
    Object.assign(errs, dateValidationErrors);
    if (quote?.promoCodeError && values.promoCode.trim()) {
      errs.promoCode = tBooking('promo_code_invalid');
    }
    return errs;
  }

  const openConfirmDialog = useCallback(() => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setConfirmOpen(true);
  }, [values, quote, t, tBooking, dateValidationErrors]);

  const confirmBooking = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setConfirmOpen(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const booking = await createBooking({
        propertyId,
        checkIn: values.checkIn,
        checkOut: values.checkOut,
        guestCount: values.guests,
        promoCode: values.promoCode.trim() || undefined,
      });
      setConfirmOpen(false);
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
          setConfirmOpen(false);
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
  }, [values, propertyId, locale, router, quote]);

  return {
    values,
    errors,
    isSubmitting,
    isQuoteLoading,
    isConfirmOpen,
    quote,
    nights,
    canSubmit,
    setField,
    setConfirmOpen,
    openConfirmDialog,
    confirmBooking,
  };
}
