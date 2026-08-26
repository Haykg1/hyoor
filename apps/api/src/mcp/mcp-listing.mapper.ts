import type { PropertySummary } from '@repo/shared';

import { MCP_AMENITY_LIMIT, MCP_DESCRIPTION_MAX_CHARS, MCP_PHOTO_LIMIT } from './mcp.constants';
import type { McpListingCard, McpListingDetail } from './mcp.types';

export function normalizeMcpLocale(locale?: string): 'en' | 'hy' | 'ru' {
  if (locale === 'hy' || locale === 'ru') return locale;
  return 'en';
}

export function buildPropertyPageUrl(
  frontendUrl: string,
  locale: string,
  propertyId: string,
): string {
  const origin = frontendUrl.replace(/\/$/, '');
  const safeLocale = normalizeMcpLocale(locale);
  return `${origin}/${safeLocale}/property/${propertyId}`;
}

export function buildSearchPageUrl(
  frontendUrl: string,
  locale: string,
  searchPath: string,
): string {
  const origin = frontendUrl.replace(/\/$/, '');
  const safeLocale = normalizeMcpLocale(locale);
  const path = searchPath.startsWith('/') ? searchPath : `/${searchPath}`;
  return `${origin}/${safeLocale}${path}`;
}

export function toListingCard(
  property: PropertySummary,
  url: string,
  suggested?: { checkIn: string; checkOut: string },
): McpListingCard {
  return {
    id: property.id,
    title: property.title,
    city: property.city,
    region: property.region,
    country: property.country,
    propertyType: property.propertyType,
    pricePerNight: property.pricePerNight,
    currency: property.currency,
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    avgRating: property.avgRating,
    reviewCount: property.reviewCount,
    coverPhotoUrl: property.coverPhotoUrl,
    url,
    suggestedCheckIn: suggested?.checkIn,
    suggestedCheckOut: suggested?.checkOut,
  };
}

interface ListingDetailSource {
  id: string;
  title: string;
  city: string;
  region: string | null;
  country: string;
  propertyType: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  avgRating: number | null;
  reviewCount: number;
  description: string | null;
  beds: unknown;
  bathrooms: unknown;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  amenities: Array<{ name: string }>;
  photos: Array<{ url: string; isCover: boolean }>;
  host: { displayName: string };
  checkInTime: string | null;
  checkOutTime: string | null;
  minNights: number;
  maxNights: number | null;
  cancellationPolicy: string;
}

export function toListingDetail(property: ListingDetailSource, url: string): McpListingDetail {
  const photos = property.photos
    .map((photo) => photo.url)
    .filter((photoUrl): photoUrl is string => Boolean(photoUrl))
    .slice(0, MCP_PHOTO_LIMIT);
  return {
    id: property.id,
    title: property.title,
    city: property.city,
    region: property.region,
    country: property.country,
    propertyType: property.propertyType,
    pricePerNight: property.pricePerNight,
    currency: property.currency,
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    avgRating: property.avgRating ?? undefined,
    reviewCount: property.reviewCount,
    coverPhotoUrl: photos[0] ?? property.photos.find((photo) => photo.isCover)?.url,
    url,
    description: truncateDescription(property.description),
    beds: Number(property.beds),
    bathrooms: Number(property.bathrooms),
    petsAllowed: property.petsAllowed,
    smokingAllowed: property.smokingAllowed,
    partiesAllowed: property.partiesAllowed,
    amenities: property.amenities.slice(0, MCP_AMENITY_LIMIT).map((amenity) => amenity.name),
    photos,
    hostName: property.host.displayName,
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    minNights: property.minNights,
    maxNights: property.maxNights,
    cancellationPolicy: property.cancellationPolicy,
  };
}

function truncateDescription(description: string | null): string | null {
  if (!description) return null;
  if (description.length <= MCP_DESCRIPTION_MAX_CHARS) return description;
  return `${description.slice(0, MCP_DESCRIPTION_MAX_CHARS - 1).trimEnd()}…`;
}
