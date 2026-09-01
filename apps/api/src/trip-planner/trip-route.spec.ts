import { optimizeVisitOrder } from './trip-route';

interface Stop {
  id: string;
  lat: number;
  lng: number;
  isMeal: boolean;
}

// Mirrors the screenshot: 1 and 3 are close together (south), 2 is far north.
const P1: Stop = { id: '1', lat: 40.178, lng: 44.513, isMeal: false };
const P2: Stop = { id: '2', lat: 40.196, lng: 44.514, isMeal: false };
const P3: Stop = { id: '3', lat: 40.179, lng: 44.517, isMeal: false };

describe('optimizeVisitOrder', () => {
  it('puts the two nearby stops next to each other', () => {
    const ordered = optimizeVisitOrder([P1, P2, P3], null).map((s) => s.id);
    const posOf = (id: string): number => ordered.indexOf(id);
    expect(Math.abs(posOf('1') - posOf('3'))).toBe(1);
    expect(ordered).not.toEqual(['1', '2', '3']);
  });

  it('anchors the first stop to the stay', () => {
    const anchor = { lat: 40.1782, lng: 44.5135 }; // right next to P1
    const ordered = optimizeVisitOrder([P2, P3, P1], anchor).map((s) => s.id);
    expect(ordered[0]).toBe('1');
    expect(ordered[ordered.length - 1]).toBe('2');
  });

  it('keeps a meal off the first slot', () => {
    const meal: Stop = { ...P1, id: 'meal', isMeal: true };
    const ordered = optimizeVisitOrder([meal, P2, P3], null).map((s) => s.id);
    expect(ordered[0]).not.toBe('meal');
  });

  it('returns a single stop unchanged', () => {
    expect(optimizeVisitOrder([P1], null)).toEqual([P1]);
  });
});
