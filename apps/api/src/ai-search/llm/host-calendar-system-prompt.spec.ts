import { buildHostCalendarSystemPrompt } from './host-calendar-system-prompt';
import { buildProposeCalendarChangesToolDefinition } from './propose-calendar-changes.tool';

describe('host calendar USD settlement prompts', () => {
  it('requires USD priceOverride and includes FX hint', () => {
    const prompt = buildHostCalendarSystemPrompt({
      todayIso: '2026-07-20',
      maxEditableIso: '2027-07-20',
      propertyTitle: 'Full House',
      propertyId: 'prop_1',
      basePricePerNight: 100,
      currency: 'USD',
      locale: 'en',
      fxRatesHint: 'Live FX (approx): 1 USD ≈ 400 AMD',
    });
    expect(prompt).toContain('priceOverride in the tool MUST always be an integer in USD');
    expect(prompt).not.toContain('Prices are in AMD');
    expect(prompt).toContain('Live FX (approx): 1 USD ≈ 400 AMD');
    expect(prompt).toContain('Editable window: 2026-07-20 through 2027-07-20');
    expect(prompt).toContain('NOT a maximum or minimum');
    expect(prompt).toContain('NEVER invent a maximum or minimum nightly rate');
    expect(prompt).toContain('ALWAYS use that N as priceOverride');
    expect(prompt).toContain('Month name alone');
    expect(prompt).toContain('Never ask only to refine a month into day numbers');
  });

  it('describes tool priceOverride in settlement currency without base cap', () => {
    const tool = buildProposeCalendarChangesToolDefinition('USD');
    const priceOverride = (
      tool.function.parameters.properties as {
        priceOverride: { description: string; minimum: number };
      }
    ).priceOverride;
    expect(priceOverride.description).toContain('USD');
    expect(priceOverride.description).not.toContain('AMD');
    expect(priceOverride.description).toContain('not capped by base');
    expect(priceOverride.minimum).toBe(1);
  });
});
