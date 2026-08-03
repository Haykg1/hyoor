import type { Metadata } from 'next';

import type { Locale } from '@/i18n/routing';

import { absoluteUrl, languageAlternates, localizedPath } from './site';

export interface BuildPageMetadataInput {
  locale: Locale;
  /** Locale-agnostic path, e.g. `/property/abc` or `/auth/login`. */
  path: string;
  title: string;
  description: string;
  images?: string[];
  /** Optional query string without `?`, e.g. `left=a&right=b`. */
  query?: string;
  /** Auth and other non-indexable surfaces. */
  noIndex?: boolean;
}

/** Truncate plain text for meta description length (~155 chars). */
export function truncateMetaDescription(text: string, maxLength = 155): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function withQuery(pathname: string, query?: string): string {
  if (!query) {
    return pathname;
  }
  return `${pathname}?${query}`;
}

/**
 * Shared page metadata: title, description, canonical, hreflang, Open Graph, Twitter.
 * Paths use next-intl `as-needed` locale prefixing via {@link localizedPath}.
 */
export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const canonicalPath = withQuery(localizedPath(input.path, input.locale), input.query);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const images = input.images?.filter(Boolean);
  const languages = Object.fromEntries(
    Object.entries(languageAlternates(input.path)).map(([locale, url]) => {
      if (!input.query) {
        return [locale, url];
      }
      const separator = url.includes('?') ? '&' : '?';
      return [locale, `${url}${separator}${input.query}`];
    }),
  );
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalPath,
      languages,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      type: 'website',
      url: canonicalUrl,
      locale: input.locale,
      ...(images && images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: images && images.length > 0 ? 'summary_large_image' : 'summary',
      title: input.title,
      description: input.description,
      ...(images && images.length > 0 ? { images } : {}),
    },
    ...(input.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
