import { alignSearchArgsWithUserText } from './align-search-args';

describe('alignSearchArgsWithUserText', () => {
  const today = '2026-07-15';

  it('clears invented maxGuests when the prompt only mentioned nights', () => {
    const aligned = alignSearchArgsWithUserText(
      {
        locationQuery: 'Yerevan',
        stayNights: 2,
        availableFrom: '2026-07-15',
        availableTo: '2026-07-31',
        maxGuests: 2,
        propertyType: 'APARTMENT',
      },
      'Apartment in Yerevan near Republic square for two nights in july',
      today,
    );
    expect(aligned.maxGuests).toBeUndefined();
    expect(aligned.stayNights).toBe(2);
    expect(aligned.availableFrom).toBe('2026-07-15');
    expect(aligned.availableTo).toBe('2026-07-31');
  });

  it('keeps maxGuests when guests are explicit', () => {
    const aligned = alignSearchArgsWithUserText(
      { maxGuests: 3, stayNights: 2 },
      'apartment for 3 guests for 2 nights',
      today,
    );
    expect(aligned.maxGuests).toBe(3);
    expect(aligned.stayNights).toBe(2);
  });

  it('overrides wrong month-long exact stay with stated night count', () => {
    const aligned = alignSearchArgsWithUserText(
      {
        checkIn: '2026-07-15',
        checkOut: '2026-07-31',
        stayNights: 16,
      },
      'apartment for two nights in july',
      today,
    );
    expect(aligned.checkIn).toBeUndefined();
    expect(aligned.checkOut).toBeUndefined();
    expect(aligned.stayNights).toBe(2);
    expect(aligned.availableFrom).toBe('2026-07-15');
    expect(aligned.availableTo).toBe('2026-07-31');
  });
});
