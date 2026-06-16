import {
  getAiSearchOffTopicMessage,
  getHostCalendarOffTopicMessage,
  normalizeChatLocale,
} from './chat-locale';

describe('chat-locale', () => {
  it('normalizes supported locales', () => {
    expect(normalizeChatLocale('hy')).toBe('hy');
    expect(normalizeChatLocale('ru')).toBe('ru');
    expect(normalizeChatLocale('en')).toBe('en');
    expect(normalizeChatLocale('fr')).toBe('en');
  });

  it('returns localized off-topic messages', () => {
    expect(getHostCalendarOffTopicMessage('hy')).toContain('Կարող եմ');
    expect(getAiSearchOffTopicMessage('ru')).toContain('Армении');
  });
});
