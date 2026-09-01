import { deriveBudgetProfile, tierFromNightlyAmd } from '@repo/shared';

describe('deriveBudgetProfile', () => {
  it('defaults to mid when there is no stay', () => {
    const actual = deriveBudgetProfile({ guestCount: 2 });
    expect(actual.source).toBe('default_mid');
    expect(actual.tier).toBe('mid');
    expect(actual.lunchMaxAmd).toBe(6000);
    expect(actual.dinnerMaxAmd).toBe(12000);
  });
  it('tiers dining on nightly per guest and activities on total nightly', () => {
    const actual = deriveBudgetProfile({
      stay: { nightlyMinor: 90_000, currency: 'AMD', guestCount: 4 },
      guestCount: 4,
    });
    expect(actual.activityTier).toBe('premium');
    expect(actual.diningTier).toBe('mid');
    expect(actual.nightlyPerGuestAmd).toBe(22_500);
    expect(actual.lunchMaxAmd).toBe(6000);
  });
  it('maps a luxury stay to uncapped meals', () => {
    const actual = deriveBudgetProfile({
      stay: { nightlyMinor: 140_000, currency: 'AMD', guestCount: 1 },
      guestCount: 1,
    });
    expect(actual.tier).toBe('luxury');
    expect(actual.lunchMaxAmd).toBeNull();
    expect(actual.dinnerMaxAmd).toBeNull();
  });
  it('falls back to mid when FX is missing for a non-AMD stay', () => {
    const actual = deriveBudgetProfile({
      stay: { nightlyMinor: 10_000, currency: 'USD', guestCount: 2 },
      guestCount: 2,
    });
    expect(actual.source).toBe('default_mid');
  });
  it('converts USD cents to AMD with the provided FX rate', () => {
    const actual = deriveBudgetProfile({
      stay: { nightlyMinor: 10_000, currency: 'USD', guestCount: 2 },
      guestCount: 2,
      amdPerOriginalUnit: 390,
      fxAt: '2026-08-26T00:00:00.000Z',
    });
    expect(actual.source).toBe('stay');
    expect(actual.nightlyAmd).toBe(39_000);
    expect(actual.activityTier).toBe('mid');
    expect(actual.fxAt).toBe('2026-08-26T00:00:00.000Z');
  });
});

describe('tierFromNightlyAmd', () => {
  it('uses the documented AMD buckets', () => {
    expect(tierFromNightlyAmd(19_999)).toBe('budget');
    expect(tierFromNightlyAmd(20_000)).toBe('mid');
    expect(tierFromNightlyAmd(49_999)).toBe('mid');
    expect(tierFromNightlyAmd(50_000)).toBe('premium');
    expect(tierFromNightlyAmd(100_000)).toBe('luxury');
  });
});
