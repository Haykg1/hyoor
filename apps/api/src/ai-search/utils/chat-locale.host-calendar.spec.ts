import { buildHostCalendarAppliedMessage } from './chat-locale';

describe('buildHostCalendarAppliedMessage', () => {
  it('uses settlement currency for custom rates', () => {
    const message = buildHostCalendarAppliedMessage(
      {
        appliedCount: 2,
        skippedBookedCount: 0,
        dateFrom: '2026-07-25',
        dateTo: '2026-07-26',
        isAvailable: true,
        priceOverride: 120,
      },
      'Full House in Dilijan',
      'en',
      'USD',
    );
    expect(message).toContain('with rate 120 USD');
    expect(message).not.toContain('AMD');
  });
});
