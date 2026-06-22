import { CancellationPolicies, PropertyTypes } from '@repo/shared';

import type { NormalizedRow } from './row-normalizer';

export function validateNormalizedRow(row: NormalizedRow): string[] {
  const errors: string[] = [];
  if (row.title && row.title.length > 200) errors.push('title must be ≤ 200 characters');
  if (row.description && row.description.length > 5000)
    errors.push('description must be ≤ 5000 characters');
  if (
    row.propertyType &&
    !PropertyTypes.includes(row.propertyType as (typeof PropertyTypes)[number])
  ) {
    errors.push(
      `propertyType "${row.propertyType}" is not valid. Allowed: ${PropertyTypes.join(', ')}`,
    );
  }
  if (!row.city?.trim()) errors.push('city is required');
  if (row.maxGuests === undefined || row.maxGuests < 1) errors.push('maxGuests must be ≥ 1');
  if (row.bedrooms === undefined || row.bedrooms < 0) errors.push('bedrooms must be ≥ 0');
  if (row.beds === undefined || row.beds < 1) errors.push('beds must be ≥ 1');
  if (row.bathrooms === undefined || row.bathrooms < 0) errors.push('bathrooms must be ≥ 0');
  if (row.pricePerNight === undefined || row.pricePerNight < 0)
    errors.push('pricePerNight must be ≥ 0');
  if (
    row.cancellationPolicy &&
    !CancellationPolicies.includes(row.cancellationPolicy as (typeof CancellationPolicies)[number])
  ) {
    errors.push(
      `cancellationPolicy "${row.cancellationPolicy}" is not valid. Allowed: ${CancellationPolicies.join(', ')}`,
    );
  }
  return errors;
}

export function validateAddressFields(row: {
  placeKind?: string;
  street?: string;
  buildingNumber?: string;
  latitude?: number;
  longitude?: number;
}): string[] {
  const errors: string[] = [];
  if (row.placeKind !== 'house') {
    errors.push('Address could not be resolved to a verified building');
  }
  if (!row.street?.trim()) errors.push('street is required');
  if (!row.buildingNumber?.trim()) errors.push('buildingNumber is required');
  if (row.latitude === undefined || row.longitude === undefined) {
    errors.push('coordinates (latitude/longitude) are required');
  }
  return errors;
}

/** Normalize address fields for deduplication key comparison. */
export function buildAddressKey(
  street: string,
  buildingNumber: string,
  lat: number,
  lng: number,
): string {
  return [
    street.trim().toLowerCase(),
    buildingNumber.trim().toLowerCase(),
    lat.toFixed(5),
    lng.toFixed(5),
  ].join('|');
}
