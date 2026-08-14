import { MAX_PAGE_SIZE } from '@repo/shared';
import type { MetadataRoute } from 'next';

import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';
import { listProperties } from '@/lib/api/properties';
import { absoluteUrl, isIndexingEnabled, languageAlternates, localizedPath } from '@/lib/seo/site';

/** Regenerate at most once per hour — property inventory changes slowly. */
export const revalidate = 3600;

/** Public, indexable surfaces only — no auth, dashboards, or thin compare URLs. */
const STATIC_PATHS: ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/search', changeFrequency: 'daily', priority: 0.9 },
  { path: '/ai-search', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/cancellation', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/cookies', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
];

const MAX_SITEMAP_PAGES = 500;

async function fetchActivePropertyIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= MAX_SITEMAP_PAGES) {
    const result = await listProperties({ page, limit: MAX_PAGE_SIZE });
    for (const property of result.data) {
      ids.push(property.id);
    }
    if (result.data.length === 0) {
      break;
    }
    totalPages = result.totalPages;
    page += 1;
  }
  return ids;
}

function buildLocalizedEntries(input: {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}): MetadataRoute.Sitemap {
  const alternates = { languages: languageAlternates(input.path) };
  return (routing.locales as readonly Locale[]).map((locale) => ({
    url: absoluteUrl(localizedPath(input.path, locale)),
    changeFrequency: input.changeFrequency,
    priority: input.priority,
    alternates,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingEnabled()) {
    return [];
  }
  const entries: MetadataRoute.Sitemap = [];
  for (const staticPath of STATIC_PATHS) {
    entries.push(...buildLocalizedEntries(staticPath));
  }
  let propertyIds: string[] = [];
  try {
    propertyIds = await fetchActivePropertyIds();
  } catch {
    propertyIds = [];
  }
  for (const propertyId of propertyIds) {
    entries.push(
      ...buildLocalizedEntries({
        path: `/property/${propertyId}`,
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    );
  }
  return entries;
}
