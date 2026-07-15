const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  один: 1,
  одна: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  մեկ: 1,
  երկու: 2,
  երեք: 3,
  չորս: 4,
  հինգ: 5,
};

function parseCountToken(token: string): number | undefined {
  const asNumber = Number.parseInt(token, 10);
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 30) return asNumber;
  return WORD_NUMBERS[token.toLowerCase()];
}

/**
 * True when the guest explicitly named a party size (not stay length).
 * "two nights" must not count as guests.
 */
export function mentionsGuestCount(text: string): boolean {
  const lower = text.toLowerCase();
  if (
    /\b\d+\s*(guests?|people|persons?|adults?|pax)\b/.test(lower) ||
    /\b(guests?|people|persons?|adults?|pax)\s*[:=]?\s*\d+\b/.test(lower) ||
    /\bfor\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(guests?|people|persons?|adults?)\b/.test(
      lower,
    ) ||
    /\b(couple|pair)\b/.test(lower) ||
    /\bfamily\s+of\s+\d+\b/.test(lower)
  ) {
    return true;
  }
  if (lower.includes('гость') || lower.includes('человек') || lower.includes('հյուր')) {
    return true;
  }
  return false;
}

/**
 * Extracts an explicit stay length like "2 nights" / "two nights".
 * Returns undefined when none is stated.
 */
export function inferStayNightsFromText(text: string): number | undefined {
  const lower = text.toLowerCase();
  const digit = lower.match(/\b(\d+)\s*(nights?|ноч|գիշեր)/);
  if (digit?.[1]) {
    const n = Number.parseInt(digit[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 60) return n;
  }
  const word = lower.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|մեկ|երկու|երեք|չորս|հինգ)\s*(nights?|ноч|գիշեր)/,
  );
  if (word?.[1]) return parseCountToken(word[1]);
  const days = lower.match(/\b(\d+)\s*(days?|дня|дней|օր)/);
  if (days?.[1]) {
    const n = Number.parseInt(days[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 60) return Math.max(1, n);
  }
  return undefined;
}
