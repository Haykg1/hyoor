import { evaluateHostCalendarMessage } from './host-calendar-input-guard';

const context = {
  currentPropertyTitle: 'Cozy Yerevan Apartment',
  currentPropertyCity: 'Yerevan',
  otherPropertyTitles: ['Gyumri Cottage'],
};

describe('evaluateHostCalendarMessage', () => {
  it('allows calendar management messages', () => {
    expect(
      evaluateHostCalendarMessage([{ role: 'user', content: 'Close June 10-15' }], context).allowed,
    ).toBe(true);
  });

  it('rejects other property requests', () => {
    const result = evaluateHostCalendarMessage(
      [{ role: 'user', content: 'Also close dates on my Gyumri Cottage' }],
      context,
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toContain('Cozy Yerevan Apartment');
    }
  });

  it('rejects guest search intents', () => {
    const result = evaluateHostCalendarMessage(
      [{ role: 'user', content: 'Find an apartment in Yerevan for 2 guests' }],
      context,
    );
    expect(result.allowed).toBe(false);
  });

  it('allows short follow-ups after assistant clarifications', () => {
    const messages = [
      { role: 'user' as const, content: 'Close this property for the next 10 days' },
      {
        role: 'assistant' as const,
        content: 'From which date should I close it for the next 10 days?',
      },
      { role: 'user' as const, content: 'yes' },
    ];
    expect(evaluateHostCalendarMessage(messages, context).allowed).toBe(true);
  });

  it('allows next-N-days phrasing without a space', () => {
    expect(
      evaluateHostCalendarMessage(
        [{ role: 'user', content: 'please close this property for next 10days' }],
        context,
      ).allowed,
    ).toBe(true);
  });

  it('allows seasonal pricing phrasing', () => {
    expect(
      evaluateHostCalendarMessage(
        [{ role: 'user', content: 'i want this property to be more pricey on summer' }],
        context,
      ).allowed,
    ).toBe(true);
    expect(
      evaluateHostCalendarMessage(
        [{ role: 'user', content: 'make this property more expensive while summer' }],
        context,
      ).allowed,
    ).toBe(true);
  });

  it('allows generated-style rate suggestions', () => {
    expect(
      evaluateHostCalendarMessage(
        [{ role: 'user', content: 'Set 62000 AMD per night for June 1–August 31' }],
        context,
      ).allowed,
    ).toBe(true);
  });
});
