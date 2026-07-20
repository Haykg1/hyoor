import { buildHostCalendarSystemPrompt } from './host-calendar-system-prompt';
import { buildProposeCalendarChangesToolDefinition } from './propose-calendar-changes.tool';

describe('host calendar USD settlement prompts', () => {
  it('requires USD priceOverride and includes FX hint', () => {
    const prompt = buildHostCalendarSystemPrompt({
      todayIso: '2026-07-20',
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
  });

  it('describes tool priceOverride in settlement currency', () => {
    const tool = buildProposeCalendarChangesToolDefinition('USD');
    const priceOverride = (
      tool.function.parameters.properties as {
        priceOverride: { description: string };
      }
    ).priceOverride;
    expect(priceOverride.description).toContain('USD');
    expect(priceOverride.description).not.toContain('AMD');
  });
});
