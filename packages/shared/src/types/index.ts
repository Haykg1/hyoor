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

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';
export type MessageKind = 'TEXT' | 'PROPERTY_CARD';

export interface MessagePropertyCard {
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

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind: MessageKind;
  propertyId: string | null;
  property: MessagePropertyCard | null;
  status: MessageStatus;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationParticipantView {
  id: string;
  firstName: string | null;
  lastName: string | null;
  /** Resolved display label — company name for company hosts, otherwise first + last name. */
  displayName: string;
  avatarUrl: string | null;
  nationality: string | null;
}

export interface ConversationPreview {
  id: string;
  guestId: string;
  hostUserId: string;
  createdAt: string;
  updatedAt: string;
  otherParticipant: ConversationParticipantView;
  lastMessage: MessageView | null;
  unreadCount: number;
}

export interface ConversationDetail {
  id: string;
  guestId: string;
  hostUserId: string;
  createdAt: string;
  updatedAt: string;
  otherParticipant: ConversationParticipantView;
  unreadCount: number;
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

/** Currency a host can actually price a listing in. Stripe transactions are USD-only —
 * hosts do not choose a settlement currency. */
export const HostSettlementCurrencies = ['USD'] as const;
export type HostSettlementCurrency = (typeof HostSettlementCurrencies)[number];

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

/** Cosmetic, non-charged guest-facing price estimate. `amount` is a rounded major-unit
 * figure (e.g. `120` for "≈120 PLN"), unlike `pricePerNight` which stays in minor units. */
export interface DisplayPrice {
  amount: number;
  currency: string;
}

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
  displayPrice?: DisplayPrice | null;
  coverPhotoUrl?: string;
  /** Up to 5 photo URLs for card hover preview; first matches coverPhotoUrl when present. */
  photoUrls?: string[];
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
  displayPrice?: DisplayPrice | null;
  cleaningFee: number | null;
  securityDeposit: number | null;
  cancellationPolicy: string;
  cancellationFeeType: import('../utils/cancellation-fee').CancellationFeeType;
  cancellationFeeValue: number;
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
  cancellationPolicy: string;
  cancellationFeeType: import('../utils/cancellation-fee').CancellationFeeType;
  cancellationFeeValue: number;
}

export interface BookingGuestProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  /** Present for viewers of the booking (guest/host/admin). */
  email?: string | null;
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
  nightlyBreakdown?: import('../dto/booking-quote').BookingNightPrice[] | null;
  cleaningFee: number;
  securityDeposit: number;
  discountAmount: number;
  promotionId: string | null;
  totalAmount: number;
  currency: string;
  /** Platform fee taken from the booking (settlement units). Null until payment is settled. */
  platformFeeAmount: number | null;
  /** Host payout amount (settlement units). Null until payment is settled. */
  hostPayoutAmount: number | null;
  payoutStatus: PayoutStatus;
  refundedAmount: number;
  specialRequests: string | null;
  cancellationReason: string | null;
  paymentProvider: string | null;
  paymentStatus: string;
  paymentLockExpiresAt: string | null;
  depositStatus: string;
  capturedAt: string | null;
  createdAt: string;
  updatedAt: string;
  property: BookingPropertySummary;
  guest: BookingGuestProfile;
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
  bedrooms: number;
  maxGuests: number;
  avgRating?: number;
  reviewCount: number;
  /** Sum of paid host payouts for this listing (same units as pricePerNight). */
  totalEarnings: number;
}

export const EarningsPresets = ['last_30_days', 'last_year', 'custom'] as const;
export type EarningsPreset = (typeof EarningsPresets)[number];

export const HostAnalyticsPresets = [
  'last_30_days',
  'last_90_days',
  'this_year',
  'custom',
] as const;
export type HostAnalyticsPreset = (typeof HostAnalyticsPresets)[number];

export interface HostAnalyticsPeriod {
  from: string;
  to: string;
  preset: HostAnalyticsPreset;
}

export interface HostAnalyticsKpiMetric {
  /** Primary money value in settlement currency (USD), or percent for cancellationRate. */
  value: number | null;
  previous: number | null;
  /** Percent change vs previous period. Null when previous is 0/null or current is null. */
  deltaPct: number | null;
  /** Absolute delta (used for nights booked). */
  deltaAbs: number | null;
  /** USD amount for money KPIs (same units as `value` when settlement is USD). */
  valueUsd: number | null;
  secondary?: {
    propertyCount?: number;
    cancellationCount?: number;
  };
}

export interface HostAnalyticsKpis {
  adr: HostAnalyticsKpiMetric;
  revpar: HostAnalyticsKpiMetric;
  nightsBooked: HostAnalyticsKpiMetric;
  cancellationRate: HostAnalyticsKpiMetric;
}

export interface HostAnalyticsMonthlyEarning {
  /** ISO month start (UTC). */
  month: string;
  earnings: number;
}

export interface HostAnalyticsOccupancyPoint {
  /** ISO month start (UTC). */
  month: string;
  hostPct: number | null;
  marketPct: number | null;
}

export interface HostAnalyticsGuestOrigin {
  country: string;
  bookings: number;
  nights: number;
  revenue: number;
}

export interface HostAnalyticsResponse {
  period: HostAnalyticsPeriod;
  previousPeriod: { from: string; to: string };
  /** Selected listing id, or null when analytics cover all host properties. */
  propertyId: string | null;
  kpis: HostAnalyticsKpis;
  monthlyEarnings: HostAnalyticsMonthlyEarning[];
  occupancyTrend: HostAnalyticsOccupancyPoint[];
  guestOrigins: HostAnalyticsGuestOrigin[];
  /** ISO currency code for money fields (host settlement). */
  settlementCurrency: HostSettlementCurrency;
  /** @deprecated Prefer `settlementCurrency`. Kept for older clients. */
  amdPerUsd?: number | null;
}

/** Cached FX table used for cosmetic display conversion (USD pivot). */
export interface CurrencyRatesPayload {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string | null;
}

export interface HostDashboardStats {
  totalListings: number;
  activeListings: number;
  pendingRequests: number;
  upcomingReservations: number;
  pastReservations: number;
  totalEarnings: number;
  /** ISO start of the earnings window (admin dashboard only). */
  earningsFrom?: string;
  /** ISO end of the earnings window (admin dashboard only). */
  earningsTo?: string;
  /** Currency for totalEarnings when shown as platform fees (admin). */
  earningsCurrency?: 'USD';
}

export interface HostListingsResponse {
  data: HostListingSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: HostDashboardStats;
}

/** Mirrors Prisma `BookingStatus` — keep in sync with booking.prisma. */
export const BookingStatuses = [
  'AWAITING_PAYMENT',
  'PENDING',
  'CONFIRMED',
  'CANCELLED_BY_GUEST',
  'CANCELLED_BY_HOST',
  'PAYMENT_EXPIRED',
  'COMPLETED',
  'NO_SHOW',
] as const;
export type BookingStatus = (typeof BookingStatuses)[number];

/** Mirrors Prisma `PaymentStatus` — keep in sync with booking.prisma. */
export const PaymentStatuses = [
  'UNPAID',
  'PENDING',
  'PAID',
  'AUTHORIZED',
  'CAPTURED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
  'CANCELLED',
] as const;
export type PaymentStatus = (typeof PaymentStatuses)[number];

/** Mirrors Prisma `PayoutStatus` — keep in sync with booking.prisma. */
export const PayoutStatuses = ['NONE', 'SCHEDULED', 'PAID', 'FAILED'] as const;
export type PayoutStatus = (typeof PayoutStatuses)[number];

/** Mirrors Prisma `DepositStatus` — keep in sync with booking.prisma. */
export const DepositStatuses = ['NONE', 'AUTHORIZED', 'RELEASED', 'CAPTURED', 'FAILED'] as const;
export type DepositStatus = (typeof DepositStatuses)[number];

export const PaymentFailureCategories = [
  'RENT_CAPTURE_FAILED',
  'DEPOSIT_RELEASE_FAILED',
  'DEPOSIT_CLAIM_TRANSFER_FAILED',
  'PAYOUT_TRANSFER_FAILED',
  'PAYMENT_LOCK_SWEEP_FAILED',
  'CANCELLATION_CAPTURE_FAILED',
] as const;
export type PaymentFailureCategory = (typeof PaymentFailureCategories)[number];

export interface AdminPaymentFailure {
  id: string;
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  guestId: string;
  guestName: string;
  hostProfileId: string;
  hostName: string;
  category: PaymentFailureCategory;
  message: string;
  stripeErrorCode: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AdminBooking {
  id: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  depositStatus: DepositStatus;
  payoutStatus: PayoutStatus;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nightsCount: number;
  nightlyRate: number;
  nightlyBreakdown: import('../dto/booking-quote').BookingNightPrice[];
  cleaningFee: number;
  securityDeposit: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  platformFeeAmount: number | null;
  hostPayoutAmount: number | null;
  refundedAmount: number;
  propertyId: string;
  propertyTitle: string;
  guestId: string;
  guestName: string;
  hostProfileId: string;
  hostName: string;
  cancellationPolicy: string;
  cancellationFeeType: import('../utils/cancellation-fee').CancellationFeeType;
  cancellationFeeValue: number;
  canRetryRentCapture: boolean;
  canRetryPayout: boolean;
  createdAt: string;
}

export interface AdminHost {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  hostType: 'INDIVIDUAL' | 'COMPANY';
  companyName: string | null;
  isVerified: boolean;
  propertyCount: number;
  platformFeePercent: number | null;
  defaultPlatformFeePercent: number;
  effectivePlatformFeePercent: number;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  createdAt: string;
}
