export const StayFeeRulesModes = ['SIMPLE', 'RULES'] as const;
export type StayFeeRulesMode = (typeof StayFeeRulesModes)[number];

export const StayFeeDepositTypes = ['FIXED', 'PERCENT'] as const;
export type StayFeeDepositType = (typeof StayFeeDepositTypes)[number];

export const StayFeeRulesValidationCodes = {
  SIMPLE_REQUIRES_CATCH_ALL: 'SIMPLE_REQUIRES_CATCH_ALL',
  SIMPLE_DEPOSIT_MUST_BE_FIXED: 'SIMPLE_DEPOSIT_MUST_BE_FIXED',
  DATES_BOTH_OR_NEITHER: 'DATES_BOTH_OR_NEITHER',
  DATE_FROM_AFTER_TO: 'DATE_FROM_AFTER_TO',
  MIN_NIGHTS_INVALID: 'MIN_NIGHTS_INVALID',
  MAX_NIGHTS_INVALID: 'MAX_NIGHTS_INVALID',
  MIN_NIGHTS_BELOW_PROPERTY: 'MIN_NIGHTS_BELOW_PROPERTY',
  MIN_NIGHTS_ABOVE_PROPERTY_MAX: 'MIN_NIGHTS_ABOVE_PROPERTY_MAX',
  MAX_NIGHTS_ABOVE_PROPERTY_MAX: 'MAX_NIGHTS_ABOVE_PROPERTY_MAX',
  CLEANING_FEE_INVALID: 'CLEANING_FEE_INVALID',
  PERCENT_DEPOSIT_INVALID: 'PERCENT_DEPOSIT_INVALID',
  FIXED_DEPOSIT_INVALID: 'FIXED_DEPOSIT_INVALID',
  SEASON_OVERLAP: 'SEASON_OVERLAP',
  BAND_OVERLAP: 'BAND_OVERLAP',
  SIMPLE_FIELDS_IN_RULES_MODE: 'SIMPLE_FIELDS_IN_RULES_MODE',
  RULES_PAYLOAD_IN_SIMPLE_MODE: 'RULES_PAYLOAD_IN_SIMPLE_MODE',
  STAY_FEE_PAYLOAD_REQUIRED: 'STAY_FEE_PAYLOAD_REQUIRED',
  EMPTY_STAY_FEE_RULES: 'EMPTY_STAY_FEE_RULES',
  MODE_SWITCH_SIMPLE_REQUIRES_CATCH_ALL: 'MODE_SWITCH_SIMPLE_REQUIRES_CATCH_ALL',
} as const;

export type StayFeeRulesValidationCode =
  (typeof StayFeeRulesValidationCodes)[keyof typeof StayFeeRulesValidationCodes];

export interface StayFeeRuleInput {
  id?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  minNights: number;
  maxNights?: number | null;
  cleaningFee: number;
  depositType: StayFeeDepositType;
  depositValue: number;
  sortOrder?: number;
}

export interface ResolveStayFeesParams {
  mode: StayFeeRulesMode;
  rules: StayFeeRuleInput[];
  checkIn: string | Date;
  nights: number;
  accommodationAfterPromo: number;
}

export interface ResolvedStayFees {
  cleaningFee: number;
  securityDeposit: number;
  matchedRule: StayFeeRuleInput | null;
}

function toIsoDate(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function seasonKey(rule: StayFeeRuleInput): string {
  if (rule.dateFrom == null && rule.dateTo == null) return '__default__';
  return `${rule.dateFrom ?? ''}:${rule.dateTo ?? ''}`;
}

/** Year-round catch-all shape (SIMPLE mode + RULES off-season fallback). */
export function isCatchAllRule(rule: StayFeeRuleInput): boolean {
  return (
    rule.dateFrom == null &&
    rule.dateTo == null &&
    rule.minNights === 1 &&
    (rule.maxNights == null || rule.maxNights === undefined)
  );
}

function nightsMatch(rule: StayFeeRuleInput, nights: number): boolean {
  if (nights < rule.minNights) return false;
  if (rule.maxNights == null || rule.maxNights === undefined) return true;
  return nights <= rule.maxNights;
}

function checkInInSeason(rule: StayFeeRuleInput, checkInIso: string): boolean {
  if (rule.dateFrom == null && rule.dateTo == null) return true;
  if (rule.dateFrom == null || rule.dateTo == null) return false;
  const from = toIsoDate(rule.dateFrom);
  const to = toIsoDate(rule.dateTo);
  return checkInIso >= from && checkInIso <= to;
}

function computeDeposit(rule: StayFeeRuleInput, accommodationAfterPromo: number): number {
  if (rule.depositType === 'PERCENT') {
    return Math.round((accommodationAfterPromo * rule.depositValue) / 100);
  }
  return Math.max(0, rule.depositValue);
}

/** Year-round catch-all used for SIMPLE mode (and as RULES off-season fallback). */
export function findCatchAllRule(rules: StayFeeRuleInput[]): StayFeeRuleInput | null {
  return rules.find(isCatchAllRule) ?? null;
}

/** True when RULES mode has a year-round default season for off-season check-ins. */
export function hasYearRoundFallback(rules: StayFeeRuleInput[]): boolean {
  return findCatchAllRule(rules) !== null;
}

/** Derived simple-mode amounts for API/UI convenience. */
export function deriveSimpleFees(rules: StayFeeRuleInput[]): {
  cleaningFee: number;
  securityDeposit: number;
} {
  const catchAll = findCatchAllRule(rules);
  if (!catchAll) return { cleaningFee: 0, securityDeposit: 0 };
  if (catchAll.depositType === 'PERCENT') {
    return { cleaningFee: catchAll.cleaningFee, securityDeposit: 0 };
  }
  return { cleaningFee: catchAll.cleaningFee, securityDeposit: catchAll.depositValue };
}

export function buildSimpleCatchAllRule(
  cleaningFee: number,
  securityDeposit: number,
): StayFeeRuleInput {
  return {
    dateFrom: null,
    dateTo: null,
    minNights: 1,
    maxNights: null,
    cleaningFee: Math.max(0, cleaningFee),
    depositType: 'FIXED',
    depositValue: Math.max(0, securityDeposit),
    sortOrder: 0,
  };
}

export function resolveStayFees(params: ResolveStayFeesParams): ResolvedStayFees {
  const { mode, rules, nights, accommodationAfterPromo } = params;
  const checkInIso = toIsoDate(params.checkIn);
  if (mode === 'SIMPLE') {
    const catchAll = findCatchAllRule(rules);
    if (!catchAll) return { cleaningFee: 0, securityDeposit: 0, matchedRule: null };
    return {
      cleaningFee: Math.max(0, catchAll.cleaningFee),
      securityDeposit: computeDeposit(catchAll, accommodationAfterPromo),
      matchedRule: catchAll,
    };
  }
  const datedMatches = rules.filter(
    (rule) => rule.dateFrom != null && rule.dateTo != null && checkInInSeason(rule, checkInIso),
  );
  const pool =
    datedMatches.length > 0
      ? datedMatches
      : rules.filter((rule) => rule.dateFrom == null && rule.dateTo == null);
  const matched = pool.find((rule) => nightsMatch(rule, nights)) ?? null;
  if (!matched) return { cleaningFee: 0, securityDeposit: 0, matchedRule: null };
  return {
    cleaningFee: Math.max(0, matched.cleaningFee),
    securityDeposit: computeDeposit(matched, accommodationAfterPromo),
    matchedRule: matched,
  };
}

export interface StayFeeRulesValidationOptions {
  mode: StayFeeRulesMode;
  rules: StayFeeRuleInput[];
  propertyMinNights?: number;
  propertyMaxNights?: number | null;
}

export function validateStayFeeRules(
  options: StayFeeRulesValidationOptions,
): StayFeeRulesValidationCode | null {
  const { mode, rules } = options;
  const propertyMinNights = options.propertyMinNights ?? 1;
  const propertyMaxNights = options.propertyMaxNights ?? null;
  if (mode === 'SIMPLE') {
    const catchAlls = rules.filter(isCatchAllRule);
    if (catchAlls.length !== 1) {
      return StayFeeRulesValidationCodes.SIMPLE_REQUIRES_CATCH_ALL;
    }
    if (catchAlls[0]!.depositType !== 'FIXED') {
      return StayFeeRulesValidationCodes.SIMPLE_DEPOSIT_MUST_BE_FIXED;
    }
    return null;
  }
  for (const rule of rules) {
    const hasFrom = rule.dateFrom != null && rule.dateFrom !== '';
    const hasTo = rule.dateTo != null && rule.dateTo !== '';
    if (hasFrom !== hasTo) {
      return StayFeeRulesValidationCodes.DATES_BOTH_OR_NEITHER;
    }
    if (hasFrom && hasTo && toIsoDate(rule.dateFrom!) > toIsoDate(rule.dateTo!)) {
      return StayFeeRulesValidationCodes.DATE_FROM_AFTER_TO;
    }
    if (!Number.isInteger(rule.minNights) || rule.minNights < 1) {
      return StayFeeRulesValidationCodes.MIN_NIGHTS_INVALID;
    }
    if (
      rule.maxNights != null &&
      (!Number.isInteger(rule.maxNights) || rule.maxNights < rule.minNights)
    ) {
      return StayFeeRulesValidationCodes.MAX_NIGHTS_INVALID;
    }
    if (rule.minNights < propertyMinNights) {
      return StayFeeRulesValidationCodes.MIN_NIGHTS_BELOW_PROPERTY;
    }
    if (propertyMaxNights != null && rule.minNights > propertyMaxNights) {
      return StayFeeRulesValidationCodes.MIN_NIGHTS_ABOVE_PROPERTY_MAX;
    }
    if (propertyMaxNights != null && rule.maxNights != null && rule.maxNights > propertyMaxNights) {
      return StayFeeRulesValidationCodes.MAX_NIGHTS_ABOVE_PROPERTY_MAX;
    }
    if (rule.cleaningFee < 0 || !Number.isInteger(rule.cleaningFee)) {
      return StayFeeRulesValidationCodes.CLEANING_FEE_INVALID;
    }
    if (rule.depositType === 'PERCENT') {
      if (
        !Number.isInteger(rule.depositValue) ||
        rule.depositValue < 0 ||
        rule.depositValue > 100
      ) {
        return StayFeeRulesValidationCodes.PERCENT_DEPOSIT_INVALID;
      }
    } else if (rule.depositValue < 0 || !Number.isInteger(rule.depositValue)) {
      return StayFeeRulesValidationCodes.FIXED_DEPOSIT_INVALID;
    }
  }
  const datedWindows = new Map<string, { from: string; to: string }>();
  for (const rule of rules) {
    if (rule.dateFrom == null || rule.dateTo == null) continue;
    const key = seasonKey(rule);
    if (!datedWindows.has(key)) {
      datedWindows.set(key, { from: toIsoDate(rule.dateFrom), to: toIsoDate(rule.dateTo) });
    }
  }
  const windows = [...datedWindows.values()].sort((a, b) => a.from.localeCompare(b.from));
  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      const a = windows[i]!;
      const b = windows[j]!;
      if (a.from <= b.to && b.from <= a.to) {
        return StayFeeRulesValidationCodes.SEASON_OVERLAP;
      }
    }
  }
  const bySeason = new Map<string, StayFeeRuleInput[]>();
  for (const rule of rules) {
    const key = seasonKey(rule);
    const list = bySeason.get(key) ?? [];
    list.push(rule);
    bySeason.set(key, list);
  }
  for (const bands of bySeason.values()) {
    const sorted = [...bands].sort((a, b) => a.minNights - b.minNights);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        const aMax = a.maxNights ?? Number.POSITIVE_INFINITY;
        const bMax = b.maxNights ?? Number.POSITIVE_INFINITY;
        if (a.minNights <= bMax && b.minNights <= aMax) {
          return StayFeeRulesValidationCodes.BAND_OVERLAP;
        }
      }
    }
  }
  return null;
}
