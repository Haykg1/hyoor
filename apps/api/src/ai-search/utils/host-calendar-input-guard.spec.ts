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
});
