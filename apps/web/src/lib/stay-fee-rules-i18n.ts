import type { StayFeeRulesValidationCode } from '@repo/shared';

type StayFeeRulesTranslator = {
  (key: string): string;
  has?: (key: string) => boolean;
};

export function translateStayFeeValidationCode(
  t: StayFeeRulesTranslator,
  code: StayFeeRulesValidationCode | string | null | undefined,
): string | null {
  if (!code) return null;
  const key = `validation.${code}`;
  if (t.has && !t.has(key)) return String(code);
  return t(key);
}
