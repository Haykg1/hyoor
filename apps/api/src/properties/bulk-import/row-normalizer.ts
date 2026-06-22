import { CancellationPolicies, PropertyTypes } from '@repo/shared';

import type { RawRow } from './spreadsheet.parser';

// Maps common user column aliases → canonical field names
const COLUMN_ALIASES: Record<string, string> = {
  // title
  name: 'title',
  property_name: 'title',
  listing_name: 'title',
  listing_title: 'title',
  // description
  desc: 'description',
  details: 'description',
  // propertyType
  type: 'propertytype',
  property_type: 'propertytype',
  kind: 'propertytype',
  // city
  location: 'city',
  town: 'city',
  // address
  full_address: 'address',
  street_address: 'address',
  building_address: 'address',
  // maxGuests
  max_guests: 'maxguests',
  guests: 'maxguests',
  capacity: 'maxguests',
  // bedrooms
  beds_rooms: 'bedrooms',
  // beds
  bed_count: 'beds',
  // bathrooms
  baths: 'bathrooms',
  bathroom_count: 'bathrooms',
  // pricePerNight
  price: 'pricepernight',
  price_per_night: 'pricepernight',
  nightly_rate: 'pricepernight',
  night_price: 'pricepernight',
  rate: 'pricepernight',
  // cancellationPolicy
  cancellation: 'cancellationpolicy',
  cancellation_policy: 'cancellationpolicy',
  policy: 'cancellationpolicy',
  // amenities
  facilities: 'amenities',
  features: 'amenities',
  // optional
  max_adults: 'maxadults',
  max_children: 'maxchildren',
  max_infants: 'maxinfants',
  cleaning_fee: 'cleaningfee',
  security_deposit: 'securitydeposit',
  min_nights: 'minnights',
  max_nights: 'maxnights',
  check_in: 'checkintime',
  check_in_time: 'checkintime',
  check_out: 'checkouttime',
  check_out_time: 'checkouttime',
  smoking: 'smokingallowed',
  pets: 'petsallowed',
  parties: 'partiesallowed',
  additional_rules: 'additionalrules',
  extra_rules: 'additionalrules',
  external_url: 'externalbookingurl',
  booking_url: 'externalbookingurl',
  region_name: 'region',
  country_code: 'country',
  apartment: 'apartmentnumber',
  apartment_number: 'apartmentnumber',
  title_en: 'titleen',
  title_ru: 'titleru',
  title_hy: 'titlehy',
};

const PROPERTY_TYPE_ALIASES: Record<string, string> = {
  apartment: 'APARTMENT',
  apt: 'APARTMENT',
  house: 'HOUSE',
  villa: 'VILLA',
  studio: 'STUDIO',
  guesthouse: 'GUESTHOUSE',
  guest_house: 'GUESTHOUSE',
  'guest house': 'GUESTHOUSE',
  hotel: 'HOTEL_ROOM',
  hotel_room: 'HOTEL_ROOM',
  'hotel room': 'HOTEL_ROOM',
  other: 'OTHER',
};

const CANCELLATION_ALIASES: Record<string, string> = {
  flexible: 'FLEXIBLE',
  flex: 'FLEXIBLE',
  moderate: 'MODERATE',
  mod: 'MODERATE',
  strict: 'STRICT',
  non_refundable: 'NON_REFUNDABLE',
  nonrefundable: 'NON_REFUNDABLE',
  'non refundable': 'NON_REFUNDABLE',
  no_refund: 'NON_REFUNDABLE',
};

const BOOLEAN_TRUE = new Set(['true', 'yes', '1', 'allowed', 'ok', 'y']);
const BOOLEAN_FALSE = new Set(['false', 'no', '0', 'not allowed', 'n']);

export interface NormalizedRow {
  title?: string;
  description?: string;
  propertyType?: string;
  city?: string;
  address?: string;
  // Populated by geocoder (not in raw CSV columns)
  street?: string;
  buildingNumber?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  placeKind?: string;
  addressLine?: string;
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  pricePerNight?: number;
  cancellationPolicy?: string;
  region?: string;
  country?: string;
  apartmentNumber?: string;
  maxAdults?: number;
  maxChildren?: number;
  maxInfants?: number;
  cleaningFee?: number;
  securityDeposit?: number;
  minNights?: number;
  maxNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  additionalRules?: string;
  externalBookingUrl?: string;
  titleEn?: string;
  titleRu?: string;
  titleHy?: string;
  amenities?: string[];
}

export interface RowNormalizationResult {
  normalized: NormalizedRow;
  fixes: { field: string; from: string; to: string | number | boolean }[];
}

export function normalizeRow(raw: RawRow): RowNormalizationResult {
  const fixes: RowNormalizationResult['fixes'] = [];
  const mapped = applyColumnAliases(raw, fixes);
  const normalized: NormalizedRow = {};

  applyString(mapped, 'title', normalized, 'title', fixes);
  applyString(mapped, 'description', normalized, 'description', fixes);
  applyString(mapped, 'city', normalized, 'city', fixes);
  applyString(mapped, 'address', normalized, 'address', fixes);
  applyString(mapped, 'region', normalized, 'region', fixes);
  applyString(mapped, 'country', normalized, 'country', fixes);
  applyString(mapped, 'apartmentnumber', normalized, 'apartmentNumber', fixes);
  applyString(mapped, 'checkintime', normalized, 'checkInTime', fixes);
  applyString(mapped, 'checkouttime', normalized, 'checkOutTime', fixes);
  applyString(mapped, 'additionalrules', normalized, 'additionalRules', fixes);
  applyString(mapped, 'externalbookingurl', normalized, 'externalBookingUrl', fixes);
  applyString(mapped, 'titleen', normalized, 'titleEn', fixes);
  applyString(mapped, 'titleru', normalized, 'titleRu', fixes);
  applyString(mapped, 'titlehy', normalized, 'titleHy', fixes);

  applyPropertyType(mapped, normalized, fixes);
  applyCancellationPolicy(mapped, normalized, fixes);

  applyNumber(mapped, 'maxguests', normalized, 'maxGuests', fixes, true);
  applyNumber(mapped, 'bedrooms', normalized, 'bedrooms', fixes, true);
  applyNumber(mapped, 'beds', normalized, 'beds', fixes, true);
  applyNumber(mapped, 'bathrooms', normalized, 'bathrooms', fixes, false);
  applyNumber(mapped, 'pricepernight', normalized, 'pricePerNight', fixes, true);
  applyNumber(mapped, 'maxadults', normalized, 'maxAdults', fixes, true);
  applyNumber(mapped, 'maxchildren', normalized, 'maxChildren', fixes, true);
  applyNumber(mapped, 'maxinfants', normalized, 'maxInfants', fixes, true);
  applyNumber(mapped, 'cleaningfee', normalized, 'cleaningFee', fixes, true);
  applyNumber(mapped, 'securitydeposit', normalized, 'securityDeposit', fixes, true);
  applyNumber(mapped, 'minnights', normalized, 'minNights', fixes, true);
  applyNumber(mapped, 'maxnights', normalized, 'maxNights', fixes, true);

  applyBoolean(mapped, 'smokingallowed', normalized, 'smokingAllowed', fixes);
  applyBoolean(mapped, 'petsallowed', normalized, 'petsAllowed', fixes);
  applyBoolean(mapped, 'partiesallowed', normalized, 'partiesAllowed', fixes);

  applyAmenities(mapped, normalized, fixes);

  // Infer maxGuests from bedrooms if missing
  if (
    normalized.maxGuests === undefined &&
    normalized.bedrooms !== undefined &&
    normalized.bedrooms > 0
  ) {
    normalized.maxGuests = normalized.bedrooms * 2;
    fixes.push({ field: 'maxGuests', from: '', to: normalized.maxGuests });
  }

  // Default country to AM if missing
  if (!normalized.country) {
    normalized.country = 'AM';
  }

  // Early propertyType default — authoritative pass happens in applyBulkRowDefaults after geocode
  if (!normalized.propertyType) {
    normalized.propertyType = 'APARTMENT';
  }

  return { normalized, fixes };
}

function applyColumnAliases(
  raw: RawRow,
  fixes: RowNormalizationResult['fixes'],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonical = COLUMN_ALIASES[k] ?? k;
    if (canonical !== k && v) {
      fixes.push({ field: canonical, from: `column "${k}"`, to: canonical });
    }
    result[canonical] = v;
  }
  return result;
}

function applyString(
  mapped: Record<string, string>,
  key: string,
  out: NormalizedRow,
  field: keyof NormalizedRow,
  _fixes: RowNormalizationResult['fixes'],
): void {
  const val = mapped[key]?.trim();
  if (val) (out as Record<string, unknown>)[field] = val;
}

function applyPropertyType(
  mapped: Record<string, string>,
  out: NormalizedRow,
  fixes: RowNormalizationResult['fixes'],
): void {
  const raw = mapped['propertytype']?.trim() ?? '';
  if (!raw) return;
  const upper = raw.toUpperCase();
  if (PropertyTypes.includes(upper as (typeof PropertyTypes)[number])) {
    out.propertyType = upper;
    if (upper !== raw) fixes.push({ field: 'propertyType', from: raw, to: upper });
    return;
  }
  const alias = PROPERTY_TYPE_ALIASES[raw.toLowerCase()];
  if (alias) {
    out.propertyType = alias;
    fixes.push({ field: 'propertyType', from: raw, to: alias });
    return;
  }
  out.propertyType = raw;
}

function applyCancellationPolicy(
  mapped: Record<string, string>,
  out: NormalizedRow,
  fixes: RowNormalizationResult['fixes'],
): void {
  const raw = mapped['cancellationpolicy']?.trim() ?? '';
  if (!raw) return;
  const upper = raw.toUpperCase();
  if (CancellationPolicies.includes(upper as (typeof CancellationPolicies)[number])) {
    out.cancellationPolicy = upper;
    if (upper !== raw) fixes.push({ field: 'cancellationPolicy', from: raw, to: upper });
    return;
  }
  const alias = CANCELLATION_ALIASES[raw.toLowerCase()];
  if (alias) {
    out.cancellationPolicy = alias;
    fixes.push({ field: 'cancellationPolicy', from: raw, to: alias });
    return;
  }
  out.cancellationPolicy = raw;
}

function applyNumber(
  mapped: Record<string, string>,
  key: string,
  out: NormalizedRow,
  field: keyof NormalizedRow,
  fixes: RowNormalizationResult['fixes'],
  integer: boolean,
): void {
  const raw = mapped[key]?.trim() ?? '';
  if (!raw) return;
  const stripped = raw.replace(/[,\s]/g, '').replace(/[^\d.-]/g, '');
  const parsed = integer ? parseInt(stripped, 10) : parseFloat(stripped);
  if (Number.isNaN(parsed)) return;
  const out_ = out as Record<string, unknown>;
  if (stripped !== raw) fixes.push({ field, from: raw, to: parsed });
  out_[field] = parsed;
}

function applyBoolean(
  mapped: Record<string, string>,
  key: string,
  out: NormalizedRow,
  field: keyof NormalizedRow,
  fixes: RowNormalizationResult['fixes'],
): void {
  const raw = mapped[key]?.trim() ?? '';
  if (!raw) return;
  const lower = raw.toLowerCase();
  if (BOOLEAN_TRUE.has(lower)) {
    (out as Record<string, unknown>)[field] = true;
    if (lower !== 'true') fixes.push({ field, from: raw, to: true });
  } else if (BOOLEAN_FALSE.has(lower)) {
    (out as Record<string, unknown>)[field] = false;
    if (lower !== 'false') fixes.push({ field, from: raw, to: false });
  }
}

function applyAmenities(
  mapped: Record<string, string>,
  out: NormalizedRow,
  _fixes: RowNormalizationResult['fixes'],
): void {
  const raw = mapped['amenities']?.trim() ?? '';
  if (!raw) return;
  out.amenities = raw
    .split(/[|,;]/)
    .map((a) => a.trim())
    .filter(Boolean);
}
