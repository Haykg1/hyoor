import { inferStayNightsFromText, mentionsGuestCount } from '@repo/shared';

describe('search intent helpers', () => {
  it('detects guest mentions without treating nights as guests', () => {
    expect(mentionsGuestCount('apartment for 2 guests')).toBe(true);
    expect(mentionsGuestCount('for 3 people in Yerevan')).toBe(true);
    expect(
      mentionsGuestCount('Apartment in Yerevan near Republic square for two nights in july'),
    ).toBe(false);
  });

  it('infers stay nights from phrasing', () => {
    expect(
      inferStayNightsFromText('Apartment in Yerevan near Republic square for two nights in july'),
    ).toBe(2);
    expect(inferStayNightsFromText('5 nights in Dilijan')).toBe(5);
    expect(inferStayNightsFromText('Yerevan in July')).toBeUndefined();
  });
});
