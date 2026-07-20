import { inferPropertyTypeFromText, normalizePropertyType } from '@repo/shared';

describe('property type normalization', () => {
  it('accepts enum values in any case', () => {
    expect(normalizePropertyType('apartment')).toBe('APARTMENT');
    expect(normalizePropertyType('Hotel_Room')).toBe('HOTEL_ROOM');
    expect(normalizePropertyType('VILLA')).toBe('VILLA');
  });

  it('infers apartment from guest phrasing', () => {
    expect(
      inferPropertyTypeFromText('Apartment in Yerevan near Republic square for two nights in july'),
    ).toBe('APARTMENT');
  });

  it('infers other common types and synonyms', () => {
    expect(inferPropertyTypeFromText('looking for a cozy villa')).toBe('VILLA');
    expect(inferPropertyTypeFromText('guest house with garden')).toBe('GUESTHOUSE');
    expect(inferPropertyTypeFromText('нужна квартира в Ереване')).toBe('APARTMENT');
    expect(inferPropertyTypeFromText('բնակարան Երևանում')).toBe('APARTMENT');
  });

  it('returns undefined when no type is mentioned', () => {
    expect(inferPropertyTypeFromText('Yerevan for 2 nights in July')).toBeUndefined();
  });
});
