export * from './armenia-locations';
export * from './amenities';
export * from './notifications';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const S3_PRESIGNED_URL_EXPIRES = 3600;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_DEPOSIT_CLAIM_PHOTOS = 5;
/** Mirrors the API default (STRIPE_DEPOSIT_CLAIM_WINDOW_HOURS) for client-side window checks. */
export const DEPOSIT_CLAIM_WINDOW_HOURS = 48;
