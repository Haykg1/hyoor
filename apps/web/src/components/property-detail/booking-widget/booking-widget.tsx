'use client';

import type { PropertyDetail } from '@repo/shared';

import { useBlockedDates } from '@/hooks/use-blocked-dates';
import { useBookingForm } from '@/hooks/use-booking-form';

import { BookingConfirmDialog } from './booking-confirm-dialog';
import { BookingDateFields } from './booking-date-fields';
import { BookingGuestField } from './booking-guest-field';
import { BookingPriceHeader } from './booking-price-header';
import { BookingPromoCodeField } from './booking-promo-code-field';
import { BookingSubmitButton } from './booking-submit-button';
import { BookingSummary } from './booking-summary';

interface BookingWidgetProps {
  property: Pick<
    PropertyDetail,
    | 'id'
    | 'title'
    | 'titleLabels'
    | 'pricePerNight'
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
      <BookingPromoCodeField
        promoCode={form.values.promoCode}
        error={form.errors.promoCode}
        onChange={(v) => form.setField('promoCode', v)}
      />
      <BookingSummary
        quote={form.quote}
        isQuoteLoading={form.isQuoteLoading}
        nights={form.nights}
      />
      {form.errors.submit && (
        <p className="text-center text-sm text-destructive">{form.errors.submit}</p>
      )}
      <BookingSubmitButton
        canSubmit={form.canSubmit}
        isSubmitting={form.isSubmitting}
        onClick={form.openConfirmDialog}
      />
      <BookingConfirmDialog
        open={form.isConfirmOpen}
        onOpenChange={form.setConfirmOpen}
        propertyTitle={property.title}
        propertyTitleLabels={property.titleLabels}
        checkIn={form.values.checkIn}
        checkOut={form.values.checkOut}
        guests={form.values.guests}
        nights={form.nights ?? 0}
        quote={form.quote}
        isSubmitting={form.isSubmitting}
        onConfirm={form.confirmBooking}
      />
    </div>
  );
}
