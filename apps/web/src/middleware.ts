import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from './lib/auth-cookies';
import { decodeJwtPayload } from './lib/jwt';

const intlMiddleware = createIntlMiddleware(routing);

const protectedPaths = ['/trips', '/messages', '/reviews', '/account', '/dashboard'];
const adminPaths = ['/admin'];
const authPaths = ['/auth/login', '/auth/register'];

function getPathnameWithoutLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) {
      continue;
    }
    if (pathname === `/${locale}`) {
      return '/';
    }
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

function matchesPathPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getRoleFromAccessToken(accessToken: string | undefined): string | null {
  if (!accessToken) {
    return null;
  }
  return decodeJwtPayload(accessToken)?.role ?? null;
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  searchParams?: Record<string, string>,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}

export default function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = getPathnameWithoutLocale(pathname);
  const hasRefresh = request.cookies.has(AUTH_REFRESH_COOKIE);
  const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  const isProtected = matchesPathPrefix(pathWithoutLocale, protectedPaths);
  const isAdmin = matchesPathPrefix(pathWithoutLocale, adminPaths);
  const isAuthPage = matchesPathPrefix(pathWithoutLocale, authPaths);
  if ((isProtected || isAdmin) && !hasRefresh) {
    return redirectTo(request, '/auth/login', { next: pathname });
  }
  if (isAdmin) {
    const role = getRoleFromAccessToken(accessToken);
    if (role && role !== 'ADMIN' && role !== 'STAFF') {
      return redirectTo(request, '/dashboard');
    }
  }
  if (isAuthPage && hasRefresh) {
    const role = getRoleFromAccessToken(accessToken);
    const destination =
      role === 'HOST' || role === 'ADMIN' || role === 'STAFF' ? '/dashboard' : '/trips';
    return redirectTo(request, destination);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
