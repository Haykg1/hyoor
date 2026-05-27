'use client';

import type { PropertyDetail } from '@repo/shared';

import { useBlockedDates } from '@/hooks/use-blocked-dates';
import { useBookingForm } from '@/hooks/use-booking-form';

import { BookingDateFields } from './booking-date-fields';
import { BookingGuestField } from './booking-guest-field';
import { BookingPriceHeader } from './booking-price-header';
import { BookingSubmitButton } from './booking-submit-button';
import { BookingSummary } from './booking-summary';

interface BookingWidgetProps {
  property: Pick<
    PropertyDetail,
    | 'id'
    | 'pricePerNight'
    | 'cleaningFee'
    | 'currency'
    | 'maxGuests'
    | 'minNights'
    | 'maxNights'
    | 'avgRating'
    | 'reviewCount'
  >;
}

export function BookingWidget({ property }: BookingWidgetProps): React.JSX.Element {
  const form = useBookingForm({
    propertyId: property.id,
    pricePerNight: property.pricePerNight,
    cleaningFee: property.cleaningFee,
    maxGuests: property.maxGuests,
    minNights: property.minNights,
    maxNights: property.maxNights,
  });

  const { blockedDates } = useBlockedDates(property.id);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-md">
      <BookingPriceHeader
        pricePerNight={property.pricePerNight}
        currency={property.currency}
        avgRating={property.avgRating}
        reviewCount={property.reviewCount}
      />
      <BookingDateFields
        checkIn={form.values.checkIn}
        checkOut={form.values.checkOut}
        checkInError={form.errors.checkIn}
        checkOutError={form.errors.checkOut}
        disabledDates={blockedDates}
        onCheckInChange={(v) => form.setField('checkIn', v)}
        onCheckOutChange={(v) => form.setField('checkOut', v)}
      />
      <BookingGuestField
        guests={form.values.guests}
        maxGuests={property.maxGuests}
        error={form.errors.guests}
        onChange={(v) => form.setField('guests', v)}
      />
      <BookingSummary
        pricePerNight={property.pricePerNight}
        currency={property.currency}
        nights={form.nights}
        subtotal={form.subtotal}
        cleaningFee={form.cleaningFee}
        total={form.total}
      />
      {form.errors.submit && (
        <p className="text-center text-sm text-destructive">{form.errors.submit}</p>
      )}
      <BookingSubmitButton
        canSubmit={form.canSubmit}
        isSubmitting={form.isSubmitting}
        onClick={form.submit}
      />
    </div>
  );
}
