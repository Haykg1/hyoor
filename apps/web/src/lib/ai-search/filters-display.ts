import type { AiSearchExtractedFilters } from '@repo/shared';

export interface AiSearchFilterChip {
  key: string;
  label: string;
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

export function extractedFiltersToChips(filters: AiSearchExtractedFilters): AiSearchFilterChip[] {
  const chips: AiSearchFilterChip[] = [];
  const location = filters.locationLabel ?? filters.searchCity ?? filters.region;
  if (location) chips.push({ key: 'location', label: location });
  const dates = formatDateRange(filters.checkIn, filters.checkOut);
  if (dates) chips.push({ key: 'dates', label: dates });
  if (filters.guests && filters.guests > 0) {
    chips.push({
      key: 'guests',
      label: filters.guests === 1 ? '1 guest' : `${filters.guests} guests`,
    });
  }
  if (filters.minBedrooms)
    chips.push({ key: 'bedrooms', label: `${filters.minBedrooms}+ bedrooms` });
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? `${filters.minPrice.toLocaleString()} AMD` : null;
    const max = filters.maxPrice ? `${filters.maxPrice.toLocaleString()} AMD` : null;
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
  if (filters.minAvgRating) chips.push({ key: 'rating', label: `${filters.minAvgRating}+ rating` });
  if (filters.q) chips.push({ key: 'q', label: `"${filters.q}"` });
  return chips;
}
