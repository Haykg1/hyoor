/**
 * Resolves an ISO 3166-1 alpha-2 country/region code to a display name.
 * Falls back to the raw code when the value is not a valid region code.
 */
export function getCountryDisplayName(code: string, locale = 'en'): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return code;
  }
  try {
    const name = new Intl.DisplayNames([locale], { type: 'region' }).of(normalized);
    return name ?? normalized;
  } catch {
    return normalized;
  }
}
