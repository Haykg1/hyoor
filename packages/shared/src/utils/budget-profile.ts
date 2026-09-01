export const BUDGET_TIERS = ['budget', 'mid', 'premium', 'luxury'] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const ZERO_PRECISION_CURRENCIES = new Set(['AMD', 'JPY', 'KRW', 'VND']);

export interface StayBudgetInput {
  nightlyMinor: number;
  currency: string;
  guestCount: number;
}

export interface BudgetProfile {
  tier: BudgetTier;
  diningTier: BudgetTier;
  activityTier: BudgetTier;
  nightlyAmd: number;
  nightlyPerGuestAmd: number;
  guestCount: number;
  lunchMaxAmd: number | null;
  dinnerMaxAmd: number | null;
  source: 'stay' | 'default_mid';
  originalCurrency: string | null;
  originalNightlyMinor: number | null;
  fxAmdPerUnit: number | null;
  fxAt: string | null;
}

const MEAL_CAPS: Record<BudgetTier, { lunch: number | null; dinner: number | null }> = {
  budget: { lunch: 3000, dinner: 5000 },
  mid: { lunch: 6000, dinner: 12000 },
  premium: { lunch: 12000, dinner: 25000 },
  luxury: { lunch: null, dinner: null },
};

/**
 * Nightly AMD thresholds use major units (1 AMD = 1 stored unit).
 * Dining tier uses nightly / guestCount; activity tier uses total nightly.
 */
export function tierFromNightlyAmd(nightlyAmd: number): BudgetTier {
  if (nightlyAmd < 20_000) return 'budget';
  if (nightlyAmd < 50_000) return 'mid';
  if (nightlyAmd < 100_000) return 'premium';
  return 'luxury';
}

export function minorToMajorUnits(minor: number, currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_PRECISION_CURRENCIES.has(code)) return minor;
  return minor / 100;
}

export function defaultMidBudgetProfile(guestCount = 2): BudgetProfile {
  const caps = MEAL_CAPS.mid;
  return {
    tier: 'mid',
    diningTier: 'mid',
    activityTier: 'mid',
    nightlyAmd: 35_000,
    nightlyPerGuestAmd: Math.round(35_000 / Math.max(1, guestCount)),
    guestCount: Math.max(1, guestCount),
    lunchMaxAmd: caps.lunch,
    dinnerMaxAmd: caps.dinner,
    source: 'default_mid',
    originalCurrency: null,
    originalNightlyMinor: null,
    fxAmdPerUnit: null,
    fxAt: null,
  };
}

export function deriveBudgetProfile(params: {
  stay?: StayBudgetInput | null;
  guestCount?: number;
  amdPerOriginalUnit?: number | null;
  fxAt?: string | null;
}): BudgetProfile {
  const guestCount = Math.max(1, params.guestCount ?? params.stay?.guestCount ?? 2);
  if (!params.stay) return defaultMidBudgetProfile(guestCount);
  const major = minorToMajorUnits(params.stay.nightlyMinor, params.stay.currency);
  const code = params.stay.currency.toUpperCase();
  let nightlyAmd = major;
  let fxAmdPerUnit: number | null = null;
  if (code !== 'AMD') {
    const rate = params.amdPerOriginalUnit;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      return defaultMidBudgetProfile(guestCount);
    }
    nightlyAmd = major * rate;
    fxAmdPerUnit = rate;
  }
  nightlyAmd = Math.max(0, Math.round(nightlyAmd));
  const nightlyPerGuestAmd = Math.round(nightlyAmd / guestCount);
  const activityTier = tierFromNightlyAmd(nightlyAmd);
  const diningTier = tierFromNightlyAmd(nightlyPerGuestAmd);
  const diningCaps = MEAL_CAPS[diningTier];
  return {
    tier: activityTier,
    diningTier,
    activityTier,
    nightlyAmd,
    nightlyPerGuestAmd,
    guestCount,
    lunchMaxAmd: diningCaps.lunch,
    dinnerMaxAmd: diningCaps.dinner,
    source: 'stay',
    originalCurrency: code,
    originalNightlyMinor: params.stay.nightlyMinor,
    fxAmdPerUnit,
    fxAt: fxAmdPerUnit == null ? null : (params.fxAt ?? null),
  };
}

export function ageBandFromDateOfBirth(dateOfBirth: Date, today = new Date()): string {
  const age = ageYears(dateOfBirth, today);
  if (age < 18) return 'minor';
  if (age < 26) return 'young_adult';
  if (age < 65) return 'adult';
  return 'senior';
}

export function ageYears(dateOfBirth: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const month = today.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
  return age;
}
