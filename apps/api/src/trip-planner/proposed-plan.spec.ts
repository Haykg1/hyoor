import { parseProposedPlan } from './proposed-plan';
import type { CompactCandidate } from './trip-planner-candidates.service';

function candidate(poiId: string, overrides: Partial<CompactCandidate> = {}): CompactCandidate {
  return {
    n: 0,
    poiId,
    name: poiId,
    category: overrides.isMeal ? 'restaurant' : 'landmark',
    tags: [],
    desc: '',
    priceBand: null,
    servesAlcohol: null,
    durationMin: null,
    isMeal: false,
    lat: 40.18,
    lng: 44.51,
    ...overrides,
  };
}

const SIGHTS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((id) => candidate(id));
const MEALS = ['m1', 'm2', 'm3'].map((id) => candidate(id, { isMeal: true }));
const M1 = candidate('m1', { isMeal: true });
const BAR = candidate('bar', { tags: ['alcohol', 'nightlife'], isMeal: true });
const POOL = numbered([...SIGHTS, ...MEALS, BAR]);

function numbered(list: CompactCandidate[]): CompactCandidate[] {
  return list.map((c, i) => ({ ...c, n: i + 1 }));
}

const MEAL_IDS = new Set(['m1', 'm2', 'm3', 'bar']);
const mealCount = (picks: { poiId: string }[]): number =>
  picks.filter((p) => MEAL_IDS.has(p.poiId)).length;

function pick(poiId: string, startTime = '10:00', endTime = '11:00'): unknown {
  return { poiId, startTime, endTime, whyThisFits: '' };
}

describe('parseProposedPlan', () => {
  it('removes same-day duplicates but allows a place to repeat on another day', () => {
    const plan = parseProposedPlan(
      {
        days: [
          { theme: 'D1', picks: [pick('s1'), pick('s1', '12:00', '13:00'), pick('m1')] },
          { theme: 'D2', picks: [pick('s1'), pick('s2'), pick('m2')] },
        ],
      },
      POOL,
      7, // long trip
      3,
    );
    const d1 = plan?.days[0]?.picks.map((p) => p.poiId) ?? [];
    const d2 = plan?.days[1]?.picks.map((p) => p.poiId) ?? [];
    expect(d1.filter((id) => id === 's1')).toHaveLength(1);
    expect(d2).toContain('s1'); // cross-day repeat is fine
  });

  it('gives every day at least one eating place', () => {
    const plan = parseProposedPlan(
      {
        days: [
          { theme: 'D1', picks: [pick('s1'), pick('s2'), pick('s3')] },
          { theme: 'D2', picks: [pick('s4'), pick('s5'), pick('s6')] },
        ],
      },
      POOL,
      2,
      3,
    );
    expect(plan?.days).toHaveLength(2);
    for (const day of plan?.days ?? []) {
      expect(mealCount(day.picks)).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not repeat an eating place across a trip shorter than 5 days', () => {
    const plan = parseProposedPlan(
      {
        days: [
          { theme: 'D1', picks: [pick('s1'), pick('m1')] },
          { theme: 'D2', picks: [pick('s2'), pick('m1')] },
          { theme: 'D3', picks: [pick('s3'), pick('m1')] },
        ],
      },
      POOL,
      3, // short trip → unique meals
      3,
    );
    const allMeals = (plan?.days ?? []).flatMap((d) =>
      d.picks.filter((p) => MEAL_IDS.has(p.poiId)).map((p) => p.poiId),
    );
    expect(allMeals.length).toBeGreaterThanOrEqual(3);
    expect(new Set(allMeals).size).toBe(allMeals.length);
  });

  it('allows a repeated eating place on a trip of 5+ days', () => {
    const plan = parseProposedPlan(
      {
        days: [
          { theme: 'D1', picks: [pick('s1'), pick('m1')] },
          { theme: 'D2', picks: [pick('s2'), pick('m1')] },
        ],
      },
      numbered([...SIGHTS, M1]), // only one meal available
      6,
      3,
    );
    const d1Meals = plan?.days[0]?.picks.filter((p) => p.poiId === 'm1') ?? [];
    const d2Meals = plan?.days[1]?.picks.filter((p) => p.poiId === 'm1') ?? [];
    expect(d1Meals).toHaveLength(1);
    expect(d2Meals).toHaveLength(1);
  });

  it('never places a minor on an alcohol/nightlife stop', () => {
    const plan = parseProposedPlan(
      { days: [{ theme: 'D1', picks: [pick('bar'), pick('s1'), pick('m1')] }] },
      POOL,
      3,
      4,
      ['alcohol', 'nightlife'],
    );
    expect(plan?.days[0]?.picks.every((p) => p.poiId !== 'bar')).toBe(true);
  });

  it('caps a day at maxStops', () => {
    const plan = parseProposedPlan(
      {
        days: [
          {
            theme: 'D1',
            picks: [pick('s1'), pick('s2'), pick('s3'), pick('s4'), pick('s5'), pick('m1')],
          },
        ],
      },
      POOL,
      10,
      3,
    );
    expect(plan?.days[0]?.picks.length).toBeLessThanOrEqual(3);
  });

  it('returns null when nothing usable is produced', () => {
    expect(parseProposedPlan({ days: [] }, [], 2, 3)).toBeNull();
  });
});
