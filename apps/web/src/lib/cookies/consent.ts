export const COOKIE_CONSENT_NAME = 'rentstar_cookie_consent';
export const COOKIE_CONSENT_VERSION = 1;
/** Remember the choice for one year (common CMP practice). */
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
/** Dispatched from the footer "Cookie settings" control to reopen preferences. */
export const OPEN_COOKIE_SETTINGS_EVENT = 'rentstar:open-cookie-settings';

export interface CookieConsentState {
  version: typeof COOKIE_CONSENT_VERSION;
  /** Always true — required for sign-in and to store this choice. */
  necessary: true;
  /**
   * Functional preferences that improve the experience (theme, display currency).
   * Language may also use a locale cookie when you switch languages.
   */
  preferences: boolean;
  /** Analytics / measurement cookies and similar tech. Off until you opt in. */
  analytics: boolean;
  decidedAt: string;
}

export type CookieConsentDecision = Pick<CookieConsentState, 'preferences' | 'analytics'>;

function buildCookie(name: string, value: string, maxAge: number): string {
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function isConsentState(value: unknown): value is CookieConsentState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === COOKIE_CONSENT_VERSION &&
    record.necessary === true &&
    typeof record.preferences === 'boolean' &&
    typeof record.analytics === 'boolean' &&
    typeof record.decidedAt === 'string'
  );
}

export function parseCookieConsent(raw: string | null | undefined): CookieConsentState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isConsentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readCookieConsentFromDocument(): CookieConsentState | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_CONSENT_NAME}=([^;]*)`));
  if (!match?.[1]) {
    return null;
  }
  return parseCookieConsent(decodeURIComponent(match[1]));
}

export function writeCookieConsent(decision: CookieConsentDecision): CookieConsentState {
  const state: CookieConsentState = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: decision.preferences,
    analytics: decision.analytics,
    decidedAt: new Date().toISOString(),
  };
  if (typeof document !== 'undefined') {
    document.cookie = buildCookie(
      COOKIE_CONSENT_NAME,
      JSON.stringify(state),
      COOKIE_CONSENT_MAX_AGE_SECONDS,
    );
  }
  return state;
}

export function clearCookieConsent(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${COOKIE_CONSENT_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/** Opens the cookie preferences dialog (listened to by CookieConsent). */
export function requestOpenCookieSettings(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}

/** Gate for future analytics scripts — never load them unless the user opted in. */
export function canUseAnalytics(consent: CookieConsentState | null): boolean {
  return consent?.analytics === true;
}

/** Optional preference storage (theme, display currency) — only when opted in. */
export function canUsePreferenceStorage(consent: CookieConsentState | null): boolean {
  return consent?.preferences === true;
}
