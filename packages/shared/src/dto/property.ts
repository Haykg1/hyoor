import type { PropertyTitleLabels } from './geocoding';
import type { HostSettlementCurrency, PropertyType } from '../types/index';
import type { CancellationFeeType } from '../utils/cancellation-fee';
import { CancellationFeeTypes } from '../utils/cancellation-fee';
import type {
  StayFeeDepositType,
  StayFeeRuleInput,
  StayFeeRulesMode,
} from '../utils/stay-fee-rules';
import { StayFeeDepositTypes, StayFeeRulesModes } from '../utils/stay-fee-rules';

export const CancellationPolicies = ['FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE'] as const;
export type CancellationPolicy = (typeof CancellationPolicies)[number];
export { CancellationFeeTypes, StayFeeDepositTypes, StayFeeRulesModes };
export type { CancellationFeeType, StayFeeDepositType, StayFeeRulesMode };

export type StayFeeRuleDto = StayFeeRuleInput;

export interface StayFeeRuleView {
  id: string;
  dateFrom: string | null;
  dateTo: string | null;
  minNights: number;
  maxNights: number | null;
  cleaningFee: number;
  depositType: StayFeeDepositType;
  depositValue: number;
  sortOrder: number;
}

export const PaymentProviders = ['STRIPE', 'ARCA', 'CASH', 'IDRAM'] as const;
export type PaymentProvider = (typeof PaymentProviders)[number];

export const PhotoMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PhotoMimeType = (typeof PhotoMimeTypes)[number];

export interface CreatePropertyInput {
  title: string;
  /**
   * Optional translations of `title` per locale (hy/ru/en). Each key is optional.
   * Filling these greatly improves search reach for guests browsing in other
   * languages. Falls back to canonical `title` via `getLocalizedTitle`.
   */
  titleLabels?: PropertyTitleLabels | null;
  description: string;
  propertyType: PropertyType;
  city: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNight: number;
  cancellationPolicy: CancellationPolicy;
  cancellationFeeType?: CancellationFeeType;
  /** Percent points (0–50 when cancel allowed) or fixed amount in minor units. */
  cancellationFeeValue?: number;
  country?: string;
  region?: string;
  street?: string;
  buildingNumber?: string;
  formattedAddress?: string;
  placeKind?: string;
  apartmentNumber?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  maxAdults?: number;
  maxChildren?: number;
  maxInfants?: number;
  currency: HostSettlementCurrency;
  /** Simple-mode convenience; persisted as the year-round catch-all stay fee rule. */
  cleaningFee?: number;
  /** Simple-mode convenience (fixed deposit); persisted on the catch-all rule. */
  securityDeposit?: number;
  stayFeeRulesMode?: StayFeeRulesMode;
  stayFeeRules?: StayFeeRuleDto[];
  minNights?: number;
  maxNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  additionalRules?: string;
  guestInstructions?: string;
  externalBookingUrl?: string;
  featuredPoiIds?: string[];
}

export type UpdatePropertyInput = Partial<CreatePropertyInput> & {
  featured?: boolean;
};

export interface AmenityInput {
  name: string;
  category?: string;
  iconKey?: string;
}

export interface ReplaceAmenitiesInput {
  amenities: AmenityInput[];
}

export interface CreatePresignedPhotoUrlInput {
  mimeType: PhotoMimeType;
}

export interface PresignedPhotoUrlResponse {
  uploadUrl: string;
  key: string;
}

export interface ConfirmPhotoUploadInput {
  key: string;
  caption?: string;
  sortOrder?: number;
  isCover?: boolean;
}

// ─── Bulk import ─────────────────────────────────────────────────────────────

export const BULK_IMPORT_MAX_ROWS = 100;
export const BULK_IMPORT_FILE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const BULK_IMPORT_PREVIEW_TTL_SECONDS = 30 * 60; // 30 min
export const BULK_IMPORT_JOB_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type BulkImportRowStatus = 'valid' | 'fixed' | 'error';
export type BulkImportJobStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'completed_with_email_error';

export interface BulkImportFix {
  field: string;
  from: string | number | boolean | null | undefined;
  to: string | number | boolean | null | undefined;
}

export interface BulkImportPreviewRow {
  rowIndex: number;
  status: BulkImportRowStatus;
  original: Record<string, string>;
  normalized: Record<string, unknown>;
  fixes: BulkImportFix[];
  errors: string[];
}

export interface BulkImportPreviewResponse {
  previewId: string;
  summary: {
    total: number;
    valid: number;
    fixed: number;
    error: number;
  };
  rows: BulkImportPreviewRow[];
}

export interface BulkImportConfirmResponse {
  jobId: string;
  status: BulkImportJobStatus;
}

export interface BulkImportJobRow {
  rowIndex: number;
  title: string;
  propertyId?: string;
  error?: string;
}

export interface BulkImportJobResponse {
  jobId: string;
  status: BulkImportJobStatus;
  summary?: {
    total: number;
    created: number;
    failed: number;
  };
  rows?: BulkImportJobRow[];
  startedAt: string;
  completedAt?: string;
}
