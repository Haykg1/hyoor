import { COMPANY, PLATFORM_FEE_PERCENT_DEFAULT } from '@repo/shared';

/**
 * Maps legal markdown `[TOKEN]`s to {@link COMPANY} and shared product defaults.
 * Empty strings are left as brackets on the live page until you fill them.
 * `[SQUARE BRACKETS]` and `[LAWYER TO CONFIRM …]` are never replaced.
 */
export const LEGAL_PLACEHOLDER_VALUES = {
  'WEBSITE NAME': COMPANY.websiteName,
  'LEGAL ENTITY NAME': COMPANY.legalEntityName,
  'REG NUMBER': COMPANY.registrationNumber,
  ADDRESS: COMPANY.address,
  'SUPPORT EMAIL': COMPANY.infoEmail,
  'PRIVACY EMAIL': COMPANY.privacyEmail,
  PHONE: COMPANY.phone,
  DATE: '2026-09-14',
  '10': String(PLATFORM_FEE_PERCENT_DEFAULT),
  /** Fee-change notice, account-deletion window, and rights-response deadline (days). */
  '30': '30',
  /** Notice period for material terms / privacy changes (days). */
  '15': '15',
  /** Financial-record retention (years) — lawyer must confirm Armenian tax law. */
  '5': '5',
  /** Server-log retention (days). */
  '90': '90',
  /** Liability cap amount in AMD — lawyer sets the number. */
  AMOUNT: '10000',
  'Yerevan, Armenia': COMPANY.cityCountry,
  'session/1 year': 'up to 1 year',
  'eu-central-1 / REGION': 'eu-central-1',
} as const;

export type LegalPlaceholderToken = keyof typeof LEGAL_PLACEHOLDER_VALUES;

/**
 * Replaces filled `[TOKEN]` values. Longer tokens first so names do not overlap.
 */
export function applyLegalPlaceholders(markdown: string): string {
  const tokens = (Object.keys(LEGAL_PLACEHOLDER_VALUES) as LegalPlaceholderToken[])
    .filter((token) => LEGAL_PLACEHOLDER_VALUES[token].trim().length > 0)
    .sort((left, right) => right.length - left.length);
  return tokens.reduce((result, token) => {
    const value = LEGAL_PLACEHOLDER_VALUES[token];
    return result.split(`[${token}]`).join(value);
  }, markdown);
}
