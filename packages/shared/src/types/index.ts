export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export const UserRoles = ['GUEST', 'HOST', 'ADMIN', 'STAFF'] as const;
export type UserRole = (typeof UserRoles)[number];

export interface JwtPayload {
  sub: string;
  role: UserRole;
  jti: string;
}

export interface RefreshJwtPayload {
  sub: string;
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export const PropertyTypes = [
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'STUDIO',
  'GUESTHOUSE',
  'HOTEL_ROOM',
  'OTHER',
] as const;
export type PropertyType = (typeof PropertyTypes)[number];

export interface PropertySummary {
  id: string;
  title: string;
  slug: string;
  propertyType: PropertyType;
  city: string;
  region: string | null;
  country: string;
  pricePerNight: number;
  currency: string;
  coverPhotoUrl?: string;
  maxGuests: number;
  bedrooms: number;
  avgRating?: number;
  reviewCount: number;
  featured: boolean;
}

export const HostTypes = ['INDIVIDUAL', 'COMPANY'] as const;
export type HostType = (typeof HostTypes)[number];

export interface PublicHostProfile {
  id: string;
  hostType: HostType;
  displayName: string;
  companyName: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  responseRatePercent: number | null;
  responseTimeHours: number | null;
  avgRating: number | null;
}

export interface PropertyPhotoView {
  id: string;
  propertyId: string;
  key: string;
  url: string;
  caption: string | null;
  displayOrder: number;
}

export interface PropertyAmenityView {
  id: string;
  propertyId: string;
  name: string;
  category: string | null;
}

export interface PropertyDetail {
  id: string;
  hostId: string;
  status: string;
  propertyType: PropertyType;
  title: string;
  slug: string;
  description: string | null;
  country: string;
  region: string | null;
  city: string;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  currency: string;
  pricePerNight: number;
  cleaningFee: number | null;
  securityDeposit: number | null;
  minNights: number;
  maxNights: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  additionalRules: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  photos: PropertyPhotoView[];
  amenities: PropertyAmenityView[];
  host: PublicHostProfile;
  avgRating: number | null;
  reviewCount: number;
}

export interface ReviewAuthorProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface ReviewView {
  id: string;
  bookingId: string;
  authorId: string;
  subjectId: string;
  target: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  propertyId: string | null;
  createdAt: string;
  author: ReviewAuthorProfile;
}

export interface CreateBookingInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  specialRequests?: string;
}

export interface BookingPropertySummary {
  id: string;
  title: string;
  slug: string;
  city: string;
  country: string;
  coverPhotoUrl: string | null;
}

export interface BookingGuestProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface BookingDetail {
  id: string;
  propertyId: string;
  guestId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nightsCount: number;
  nightlyRate: number;
  cleaningFee: number;
  securityDeposit: number;
  totalAmount: number;
  currency: string;
  specialRequests: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  property: BookingPropertySummary;
  guest: BookingGuestProfile;
  conversationId: string | null;
}

export const PropertyStatuses = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
] as const;
export type PropertyStatus = (typeof PropertyStatuses)[number];

export const HostListingTabs = ['active', 'disabled'] as const;
export type HostListingTab = (typeof HostListingTabs)[number];

export interface HostListingSummary {
  id: string;
  title: string;
  status: PropertyStatus;
  propertyType: PropertyType;
  city: string;
  region: string | null;
  pricePerNight: number;
  currency: string;
  coverPhotoUrl?: string;
}

export interface HostDashboardStats {
  totalListings: number;
  activeListings: number;
  pendingRequests: number;
  totalEarnings: number;
}

export interface HostListingsResponse {
  data: HostListingSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: HostDashboardStats;
}
