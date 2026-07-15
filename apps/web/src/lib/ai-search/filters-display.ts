import type { AiSearchExtractedFilters } from '@repo/shared';

import { formatCurrencyAmount } from '@/lib/format/price';

export interface AiSearchFilterChip {
  key: string;
  label: string;
}

export interface FilterChipsOptions {
  /** Currency of minPrice/maxPrice (selected display currency). Defaults to AMD. */
  displayCurrency?: string;
}

function formatDateRange(checkIn?: string, checkOut?: string): string | undefined {
  if (!checkIn || !checkOut) return undefined;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${checkIn} – ${checkOut}`;
  }
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function formatFlexibleStay(filters: AiSearchExtractedFilters): string | undefined {
  if (!filters.stayNights || !filters.availableFrom || !filters.availableTo) {
    return undefined;
  }
  const from = new Date(`${filters.availableFrom}T00:00:00`);
  const to = new Date(`${filters.availableTo}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return `${filters.stayNights} nights`;
  }
  const monthOpts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  const sameMonth =
    from.getUTCFullYear() === to.getUTCFullYear() && from.getUTCMonth() === to.getUTCMonth();
  const windowLabel = sameMonth
    ? from.toLocaleDateString(undefined, monthOpts)
    : `${from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return `${filters.stayNights} nights · ${windowLabel}`;
}

export function extractedFiltersToChips(
  filters: AiSearchExtractedFilters,
  options: FilterChipsOptions = {},
): AiSearchFilterChip[] {
  const currency = options.displayCurrency || 'AMD';
  const chips: AiSearchFilterChip[] = [];
  const location = filters.locationLabel ?? filters.searchCity ?? filters.region;
  if (location) chips.push({ key: 'location', label: location });
  const exactDates = formatDateRange(filters.checkIn, filters.checkOut);
  const flexibleDates = formatFlexibleStay(filters);
  if (exactDates) chips.push({ key: 'dates', label: exactDates });
  else if (flexibleDates) chips.push({ key: 'dates', label: flexibleDates });
  if (filters.guests && filters.guests > 0) {
    chips.push({
      key: 'guests',
      label: filters.guests === 1 ? '1 guest' : `${filters.guests} guests`,
    });
  }
  if (filters.minBedrooms)
    chips.push({ key: 'bedrooms', label: `${filters.minBedrooms}+ bedrooms` });
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? formatCurrencyAmount(filters.minPrice, currency) : null;
    const max = filters.maxPrice ? formatCurrencyAmount(filters.maxPrice, currency) : null;
    if (min && max) chips.push({ key: 'price', label: `${min} – ${max}` });
    else if (min) chips.push({ key: 'price', label: `from ${min}` });
    else if (max) chips.push({ key: 'price', label: `up to ${max}` });
  }
  if (filters.propertyType) {
    chips.push({ key: 'type', label: filters.propertyType.replace(/_/g, ' ').toLowerCase() });
  }
  for (const amenity of filters.amenities ?? []) {
    chips.push({ key: `amenity-${amenity}`, label: amenity });
  }
  if (filters.petsAllowed) chips.push({ key: 'pets', label: 'Pets allowed' });
  if (filters.smokingAllowed) chips.push({ key: 'smoking', label: 'Smoking allowed' });
  if (filters.partiesAllowed) chips.push({ key: 'parties', label: 'Parties allowed' });
  if (filters.minAvgRating) chips.push({ key: 'rating', label: `${filters.minAvgRating}+ rating` });
  if (filters.q) chips.push({ key: 'q', label: `"${filters.q}"` });
  return chips;
}

export function formatSuggestedStayRange(
  suggestedCheckIn: string,
  suggestedCheckOut: string,
): string {
  const formatted = formatDateRange(suggestedCheckIn, suggestedCheckOut);
  return formatted ?? `${suggestedCheckIn} – ${suggestedCheckOut}`;
}
