import { isAiSearchOnTopic } from './input-guard';

describe('isAiSearchOnTopic', () => {
  it('allows property search messages', () => {
    expect(
      isAiSearchOnTopic([
        { role: 'user', content: 'Apartment in Yerevan for 2 guests June 20-25 with WiFi' },
      ]),
    ).toBe(true);
  });

  it('allows short follow-ups in an active search thread', () => {
    expect(
      isAiSearchOnTopic([
        { role: 'user', content: 'I need a place in Yerevan' },
        { role: 'assistant', content: 'What dates?' },
        { role: 'user', content: 'June 20-25' },
      ]),
    ).toBe(true);
  });

  it('rejects unrelated coding requests', () => {
    expect(
      isAiSearchOnTopic([{ role: 'user', content: 'Write me a Python script to sort a list' }]),
    ).toBe(false);
  });

  it('rejects vague off-topic questions', () => {
    expect(isAiSearchOnTopic([{ role: 'user', content: 'Who is the president of France?' }])).toBe(
      false,
    );
  });
});
