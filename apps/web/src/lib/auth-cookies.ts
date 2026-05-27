import type { AuthTokens } from '@repo/shared';

export const AUTH_ACCESS_COOKIE = 'rentstar_access_token';
export const AUTH_REFRESH_COOKIE = 'rentstar_refresh_token';

const ACCESS_COOKIE_MAX_AGE = 60 * 15;
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function buildCookie(name: string, value: string, maxAge: number): string {
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function setAuthCookies(tokens: AuthTokens): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = buildCookie(AUTH_ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_MAX_AGE);
  document.cookie = buildCookie(AUTH_REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_MAX_AGE);
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${AUTH_ACCESS_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${AUTH_REFRESH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getRefreshTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_REFRESH_COOKIE}=([^;]*)`));
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

export function getAccessTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_ACCESS_COOKIE}=([^;]*)`));
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}
