import { maxStopsForNights } from './trip-planner.constants';

describe('maxStopsForNights', () => {
  it('packs shorter trips with more stops per day', () => {
    expect(maxStopsForNights(10)).toBe(3);
    expect(maxStopsForNights(9)).toBe(4);
    expect(maxStopsForNights(7)).toBe(4);
    expect(maxStopsForNights(6)).toBe(5);
    expect(maxStopsForNights(4)).toBe(5);
    expect(maxStopsForNights(3)).toBe(6);
    expect(maxStopsForNights(1)).toBe(6);
  });
});
