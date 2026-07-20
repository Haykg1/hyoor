import { buildAiSearchInterpretation } from './ai-search-interpretation';

describe('buildAiSearchInterpretation', () => {
  it('describes flexible stay from applied filters', () => {
    const message = buildAiSearchInterpretation(
      {
        locationLabel: 'Yerevan',
        propertyType: 'APARTMENT',
        stayNights: 2,
        availableFrom: '2026-07-15',
        availableTo: '2026-07-31',
      },
      undefined,
      'en',
    );
    expect(message).toContain('apartment');
    expect(message).toContain('Yerevan');
    expect(message).toContain('2 nights');
    expect(message).not.toContain('16');
    expect(message).not.toContain('guest');
  });

  it('prefers suggested exact dates when present', () => {
    const message = buildAiSearchInterpretation(
      {
        locationLabel: 'Yerevan',
        propertyType: 'APARTMENT',
        stayNights: 2,
        availableFrom: '2026-07-15',
        availableTo: '2026-07-31',
      },
      { checkIn: '2026-07-15', checkOut: '2026-07-17' },
      'en',
    );
    expect(message).toMatch(/Jul 15/);
    expect(message).toMatch(/Jul 17/);
  });
});
