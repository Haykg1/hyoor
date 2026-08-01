import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

/** Canonical origin for absolute SEO URLs (no trailing slash). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/**
 * Whether crawlers may index this deployment.
 * Localhost is always blocked. Set NEXT_PUBLIC_ALLOW_INDEXING=false on staging,
 * or =true to force-enable (e.g. preview with a real public URL).
 */
export function isIndexingEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'false') {
    return false;
  }
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true') {
    return true;
  }
  const siteUrl = getSiteUrl();
  return !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1');
}

/** Build a locale-prefixed path using next-intl `as-needed` rules. */
export function localizedPath(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (locale === routing.defaultLocale) {
    return normalized;
  }
  if (normalized === '/') {
    return `/${locale}`;
  }
  return `/${locale}${normalized}`;
}

export function absoluteUrl(pathname: string): string {
  const siteUrl = getSiteUrl();
  if (pathname === '/') {
    return siteUrl;
  }
  return `${siteUrl}${pathname}`;
}

/** hreflang map for a logical path (includes x-default → default locale). */
export function languageAlternates(pathname: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(localizedPath(pathname, locale));
  }
  languages['x-default'] = absoluteUrl(localizedPath(pathname, routing.defaultLocale));
  return languages;
}
