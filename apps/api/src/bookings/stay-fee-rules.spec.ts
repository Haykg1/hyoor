import {
  StayFeeRulesValidationCodes,
  buildSimpleCatchAllRule,
  deriveSimpleFees,
  resolveStayFees,
  validateStayFeeRules,
} from '@repo/shared';

import { normalizeStayFeeRulesFromDto } from '../properties/stay-fee-rules.persist';

describe('stay-fee-rules', () => {
  const catchAll = buildSimpleCatchAllRule(1000, 5000);

  it('resolves SIMPLE from catch-all fixed deposit', () => {
    const result = resolveStayFees({
      mode: 'SIMPLE',
      rules: [catchAll],
      checkIn: '2026-07-01',
      nights: 3,
      accommodationAfterPromo: 30000,
    });
    expect(result.cleaningFee).toBe(1000);
    expect(result.securityDeposit).toBe(5000);
  });

  it('returns zero fees when SIMPLE has no catch-all', () => {
    const result = resolveStayFees({
      mode: 'SIMPLE',
      rules: [
        {
          dateFrom: '2026-06-01',
          dateTo: '2026-08-31',
          minNights: 1,
          maxNights: null,
          cleaningFee: 500,
          depositType: 'FIXED',
          depositValue: 100,
        },
      ],
      checkIn: '2026-07-01',
      nights: 2,
      accommodationAfterPromo: 10000,
    });
    expect(result.cleaningFee).toBe(0);
    expect(result.securityDeposit).toBe(0);
    expect(result.matchedRule).toBeNull();
  });

  it('resolves RULES percent deposit after promo', () => {
    const result = resolveStayFees({
      mode: 'RULES',
      rules: [
        {
          dateFrom: '2026-06-01',
          dateTo: '2026-08-31',
          minNights: 1,
          maxNights: 6,
          cleaningFee: 1000,
          depositType: 'PERCENT',
          depositValue: 10,
        },
      ],
      checkIn: '2026-07-10',
      nights: 3,
      accommodationAfterPromo: 30000,
    });
    expect(result.cleaningFee).toBe(1000);
    expect(result.securityDeposit).toBe(3000);
  });

  it('falls back to default season when check-in is outside dated windows', () => {
    const result = resolveStayFees({
      mode: 'RULES',
      rules: [
        {
          dateFrom: '2026-06-01',
          dateTo: '2026-08-31',
          minNights: 1,
          maxNights: null,
          cleaningFee: 10,
          depositType: 'FIXED',
          depositValue: 10,
        },
        {
          dateFrom: null,
          dateTo: null,
          minNights: 1,
          maxNights: null,
          cleaningFee: 2500,
          depositType: 'FIXED',
          depositValue: 5000,
        },
      ],
      checkIn: '2026-01-15',
      nights: 2,
      accommodationAfterPromo: 10000,
    });
    expect(result.cleaningFee).toBe(2500);
    expect(result.securityDeposit).toBe(5000);
  });

  it('rejects overlapping seasonal windows', () => {
    const error = validateStayFeeRules({
      mode: 'RULES',
      rules: [
        {
          dateFrom: '2026-06-01',
          dateTo: '2026-08-31',
          minNights: 1,
          maxNights: 2,
          cleaningFee: 0,
          depositType: 'FIXED',
          depositValue: 0,
        },
        {
          dateFrom: '2026-07-01',
          dateTo: '2026-09-30',
          minNights: 1,
          maxNights: 2,
          cleaningFee: 0,
          depositType: 'FIXED',
          depositValue: 0,
        },
      ],
    });
    expect(error).toBe(StayFeeRulesValidationCodes.SEASON_OVERLAP);
  });

  it('rejects overlapping stay bands within a season', () => {
    const error = validateStayFeeRules({
      mode: 'RULES',
      rules: [
        {
          dateFrom: null,
          dateTo: null,
          minNights: 1,
          maxNights: 5,
          cleaningFee: 0,
          depositType: 'FIXED',
          depositValue: 0,
        },
        {
          dateFrom: null,
          dateTo: null,
          minNights: 3,
          maxNights: 7,
          cleaningFee: 0,
          depositType: 'FIXED',
          depositValue: 0,
        },
      ],
    });
    expect(error).toBe(StayFeeRulesValidationCodes.BAND_OVERLAP);
  });

  it('deriveSimpleFees reads catch-all', () => {
    expect(deriveSimpleFees([catchAll])).toEqual({ cleaningFee: 1000, securityDeposit: 5000 });
  });

  it('rejects percent deposit above 100', () => {
    const error = validateStayFeeRules({
      mode: 'RULES',
      rules: [
        {
          dateFrom: null,
          dateTo: null,
          minNights: 1,
          maxNights: null,
          cleaningFee: 0,
          depositType: 'PERCENT',
          depositValue: 101,
        },
      ],
    });
    expect(error).toBe(StayFeeRulesValidationCodes.PERCENT_DEPOSIT_INVALID);
  });

  it('rejects fixed deposit above nightly rate', () => {
    const error = validateStayFeeRules({
      mode: 'RULES',
      propertyPricePerNight: 10000,
      rules: [
        {
          dateFrom: null,
          dateTo: null,
          minNights: 1,
          maxNights: null,
          cleaningFee: 0,
          depositType: 'FIXED',
          depositValue: 10001,
        },
      ],
    });
    expect(error).toBe(StayFeeRulesValidationCodes.FIXED_DEPOSIT_ABOVE_NIGHTLY);
  });

  it('rejects SIMPLE fixed deposit above nightly rate', () => {
    const error = validateStayFeeRules({
      mode: 'SIMPLE',
      propertyPricePerNight: 5000,
      rules: [buildSimpleCatchAllRule(0, 5001)],
    });
    expect(error).toBe(StayFeeRulesValidationCodes.FIXED_DEPOSIT_ABOVE_NIGHTLY);
  });

  it('normalize preserves existing deposit when updating cleaning fee only', () => {
    const existing = [buildSimpleCatchAllRule(1500, 2500)];
    const { mode, rules } = normalizeStayFeeRulesFromDto({
      mode: 'SIMPLE',
      cleaningFee: 2000,
      existingRules: existing,
    });
    expect(mode).toBe('SIMPLE');
    expect(rules).toHaveLength(1);
    expect(rules[0]?.cleaningFee).toBe(2000);
    expect(rules[0]?.depositValue).toBe(2500);
  });

  it('normalize keeps existing rules when no fee payload on update', () => {
    const existing = [
      {
        dateFrom: '2026-06-01',
        dateTo: '2026-08-31',
        minNights: 1,
        maxNights: null,
        cleaningFee: 900,
        depositType: 'FIXED' as const,
        depositValue: 100,
        sortOrder: 0,
      },
    ];
    const { mode, rules } = normalizeStayFeeRulesFromDto({
      mode: 'RULES',
      existingRules: existing,
    });
    expect(mode).toBe('RULES');
    expect(rules).toEqual(existing);
  });

  it('normalize rejects update without payload or existing rules', () => {
    expect(() => normalizeStayFeeRulesFromDto({ mode: 'RULES' })).toThrow(
      StayFeeRulesValidationCodes.STAY_FEE_PAYLOAD_REQUIRED,
    );
  });

  it('normalize rejects simple fields in RULES mode', () => {
    expect(() =>
      normalizeStayFeeRulesFromDto({
        mode: 'RULES',
        cleaningFee: 1000,
      }),
    ).toThrow(StayFeeRulesValidationCodes.SIMPLE_FIELDS_IN_RULES_MODE);
  });

  it('normalize rejects rules payload in SIMPLE mode', () => {
    expect(() =>
      normalizeStayFeeRulesFromDto({
        mode: 'SIMPLE',
        rules: [
          {
            dateFrom: '2026-06-01',
            dateTo: '2026-08-31',
            minNights: 1,
            maxNights: null,
            cleaningFee: 500,
            depositType: 'FIXED',
            depositValue: 100,
          },
        ],
      }),
    ).toThrow(StayFeeRulesValidationCodes.RULES_PAYLOAD_IN_SIMPLE_MODE);
  });

  it('normalize rejects explicitly empty stayFeeRules array', () => {
    expect(() =>
      normalizeStayFeeRulesFromDto({
        mode: 'RULES',
        rules: [],
      }),
    ).toThrow(StayFeeRulesValidationCodes.EMPTY_STAY_FEE_RULES);
  });

  it('normalize SIMPLE mode keeps only catch-all rule', () => {
    const existing = [
      buildSimpleCatchAllRule(1500, 2500),
      {
        dateFrom: '2026-06-01',
        dateTo: '2026-08-31',
        minNights: 1,
        maxNights: null,
        cleaningFee: 900,
        depositType: 'FIXED' as const,
        depositValue: 100,
        sortOrder: 1,
      },
    ];
    const { rules } = normalizeStayFeeRulesFromDto({
      mode: 'SIMPLE',
      cleaningFee: 2000,
      existingRules: existing,
    });
    expect(rules).toHaveLength(1);
    expect(rules[0]?.cleaningFee).toBe(2000);
    expect(rules[0]?.depositValue).toBe(2500);
  });
});
