import type { NormalizedRow, RowNormalizationResult } from './row-normalizer';

function buildDefaultTitle(norm: NormalizedRow): string {
  if (norm.formattedAddress) return norm.formattedAddress;
  if (norm.address && norm.buildingNumber) return `${norm.address}, ${norm.buildingNumber}`;
  if (norm.address) return norm.address;
  if (norm.addressLine) return norm.addressLine;
  if (norm.street && norm.buildingNumber) return `${norm.street}, ${norm.buildingNumber}`;
  if (norm.street) return norm.street;
  return 'Property';
}

function buildDefaultDescription(norm: NormalizedRow): string {
  const type = norm.propertyType ?? 'APARTMENT';
  const city = norm.city ?? '';
  const address =
    norm.formattedAddress ??
    norm.addressLine ??
    (norm.street && norm.buildingNumber
      ? `${norm.street}, ${norm.buildingNumber}`
      : (norm.address ?? ''));
  const guests = norm.maxGuests !== undefined ? `Up to ${norm.maxGuests} guests.` : '';
  const price =
    norm.pricePerNight !== undefined ? `${norm.pricePerNight.toLocaleString()} AMD/night.` : '';
  const location = [city, address].filter(Boolean).join(', ');
  return [type, location ? `in ${location}` : '', guests, price].filter(Boolean).join(' ').trim();
}

/**
 * Apply bulk-import-specific defaults to a normalized row after geocoding.
 * Returns fix records for each default applied so the preview shows `fixed` status.
 */
export function applyBulkRowDefaults(norm: NormalizedRow): RowNormalizationResult['fixes'] {
  const fixes: RowNormalizationResult['fixes'] = [];

  if (!norm.propertyType || !norm.propertyType.trim()) {
    norm.propertyType = 'APARTMENT';
    fixes.push({ field: 'propertyType', from: '', to: 'APARTMENT' });
  }

  if (!norm.cancellationPolicy || !norm.cancellationPolicy.trim()) {
    norm.cancellationPolicy = 'NON_REFUNDABLE';
    fixes.push({ field: 'cancellationPolicy', from: '', to: 'NON_REFUNDABLE' });
  }

  if (!norm.title?.trim()) {
    const generated = buildDefaultTitle(norm);
    norm.title = generated;
    fixes.push({ field: 'title', from: '', to: generated });
  }

  if (!norm.description?.trim()) {
    const generated = buildDefaultDescription(norm);
    norm.description = generated;
    fixes.push({ field: 'description', from: '', to: generated });
  }

  if (norm.cleaningFee === undefined) {
    norm.cleaningFee = 0;
    fixes.push({ field: 'cleaningFee', from: '', to: 0 });
  }

  if (norm.securityDeposit === undefined) {
    norm.securityDeposit = 0;
    fixes.push({ field: 'securityDeposit', from: '', to: 0 });
  }

  return fixes;
}
