import type { PropertyAddressLabels, PropertyTitleLabels } from '../dto/geocoding';

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
  titleLabels?: PropertyTitleLabels | null;
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
  addressLabels?: PropertyAddressLabels | null;
}

export const HostTypes = ['INDIVIDUAL', 'COMPANY'] as const;
export type HostType = (typeof HostTypes)[number];

/** ISO 639-1 codes + display names for the most widely spoken languages. */
export const SPOKEN_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Russian' },
  { code: 'hy', label: 'Armenian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'tr', label: 'Turkish' },
  { code: 'fa', label: 'Persian' },
  { code: 'hi', label: 'Hindi' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'pl', label: 'Polish' },
  { code: 'nl', label: 'Dutch' },
] as const;

export type SpokenLanguageCode = (typeof SPOKEN_LANGUAGES)[number]['code'];

export interface PublicHostProfile {
  id: string;
  hostType: HostType;
  displayName: string;
  companyName: string | null;
  description: string | null;
  logoUrl: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  responseRatePercent: number | null;
  responseTimeHours: number | null;
  avgRating: number | null;
  spokenLanguages: string[];
}

export interface PropertyPhotoView {
  id: string;
  propertyId: string;
  key: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  isCover: boolean;
  displayOrder?: number;
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
  titleLabels?: PropertyTitleLabels | null;
  slug: string;
  description: string | null;
  country: string;
  region: string | null;
  city: string;
  street: string | null;
  buildingNumber: string | null;
  formattedAddress: string | null;
  placeKind: string | null;
  apartmentNumber: string | null;
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
  cancellationPolicy: string;
  minNights: number;
  maxNights: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  additionalRules: string | null;
  guestInstructions: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  photos: PropertyPhotoView[];
  amenities: PropertyAmenityView[];
  host: PublicHostProfile;
  avgRating: number | null;
  reviewCount: number;
  addressLabels: PropertyAddressLabels | null;
  featuredPoiIds?: string[];
  featuredPois?: import('./poi').PropertyFeaturedPoiView[];
}

export interface ReviewAuthorProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface ReviewPhotoView {
  id: string;
  reviewId: string;
  url: string;
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
  photos?: ReviewPhotoView[];
}

export interface CreateBookingInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  specialRequests?: string;
  promoCode?: string;
}

export interface BookingPropertySummary {
  id: string;
  title: string;
  titleLabels?: PropertyTitleLabels | null;
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
  discountAmount: number;
  promotionId: string | null;
  totalAmount: number;
  currency: string;
  specialRequests: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  property: BookingPropertySummary;
  guest: BookingGuestProfile;
  conversationId: string | null;
  promotionSummary?: import('../dto/booking-quote').BookingPromotionSummary | null;
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
  titleLabels?: PropertyTitleLabels | null;
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
  upcomingReservations: number;
  pastReservations: number;
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
