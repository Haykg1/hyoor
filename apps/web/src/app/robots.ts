import type { MetadataRoute } from 'next';

import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';
import { absoluteUrl, getSiteUrl, isIndexingEnabled, localizedPath } from '@/lib/seo/site';

/** Paths that must never be indexed (auth, dashboards, account surfaces). */
const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/dashboard',
  '/account',
  '/trips',
  '/messages',
  '/bookings',
  '/favorites',
  '/auth',
  '/host',
  '/compare/s',
] as const;

function buildDisallowPaths(): string[] {
  const paths: string[] = [];
  for (const prefix of PRIVATE_PATH_PREFIXES) {
    for (const locale of routing.locales as readonly Locale[]) {
      paths.push(localizedPath(prefix, locale));
    }
  }
  return paths;
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  if (!isIndexingEnabled()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: buildDisallowPaths(),
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl.replace(/^https?:\/\//, ''),
  };
}
