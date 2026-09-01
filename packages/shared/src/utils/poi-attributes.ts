import type { PoiAttributes, PoiPriceBand } from '../types/poi';
import { POI_PRICE_BANDS } from '../types/poi';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPriceBand(value: unknown): value is PoiPriceBand {
  return typeof value === 'string' && (POI_PRICE_BANDS as readonly string[]).includes(value);
}

/**
 * Picks known attribute keys from stored JSON. Extra keys are ignored by the UI.
 */
export function parsePoiAttributes(value: unknown): PoiAttributes {
  if (!isRecord(value)) return {};
  const attributes: PoiAttributes = {};
  if (typeof value.averageMealAmd === 'number' && Number.isFinite(value.averageMealAmd)) {
    attributes.averageMealAmd = Math.max(0, Math.round(value.averageMealAmd));
  }
  if (isPriceBand(value.priceBand)) attributes.priceBand = value.priceBand;
  if (typeof value.servesAlcohol === 'boolean') attributes.servesAlcohol = value.servesAlcohol;
  if (typeof value.typicalDurationMin === 'number' && Number.isFinite(value.typicalDurationMin)) {
    attributes.typicalDurationMin = Math.max(1, Math.round(value.typicalDurationMin));
  }
  if (typeof value.openingHoursNote === 'string' && value.openingHoursNote.trim()) {
    attributes.openingHoursNote = value.openingHoursNote.trim().slice(0, 500);
  }
  if (typeof value.website === 'string' && value.website.trim()) {
    attributes.website = value.website.trim().slice(0, 500);
  }
  if (typeof value.websiteMenu === 'string' && value.websiteMenu.trim()) {
    attributes.websiteMenu = value.websiteMenu.trim().slice(0, 500);
  }
  if (typeof value.phone === 'string' && value.phone.trim()) {
    attributes.phone = value.phone.trim().slice(0, 80);
  }
  return attributes;
}

export function mergePoiAttributes(
  stored: unknown,
  patch: PoiAttributes | undefined,
): Record<string, unknown> {
  const base = isRecord(stored) ? { ...stored } : {};
  if (!patch) return base;
  const known = parsePoiAttributes({ ...base, ...patch });
  return { ...base, ...known };
}
