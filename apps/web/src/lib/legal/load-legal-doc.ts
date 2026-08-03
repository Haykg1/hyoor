import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { marked } from 'marked';

import { routing, type Locale } from '@/i18n/routing';

export type LegalDoc =
  | 'terms-of-service'
  | 'privacy-policy'
  | 'cancellation-refund-policy'
  | 'cookie-policy';

const LOCALE_AWARE_LEGAL_DOCS: ReadonlySet<LegalDoc> = new Set([
  'terms-of-service',
  'privacy-policy',
  'cancellation-refund-policy',
  'cookie-policy',
]);

function resolveLegalFileNames(doc: LegalDoc, locale?: Locale): string[] {
  if (LOCALE_AWARE_LEGAL_DOCS.has(doc)) {
    const resolved = locale && routing.locales.includes(locale) ? locale : routing.defaultLocale;
    if (resolved === routing.defaultLocale) {
      return [`${doc}.en.md`, `${doc}.md`];
    }
    return [`${doc}.${resolved}.md`, `${doc}.en.md`, `${doc}.md`];
  }
  return [`${doc}.md`];
}

/**
 * Reads a legal markdown document and renders it to HTML at build time.
 * All public legal docs are locale-aware (`*.en.md` / `*.hy.md` / `*.ru.md`),
 * with a plain `*.md` stub as last-resort fallback.
 * Pages using this must be statically rendered (`dynamic = 'force-static'`)
 * so the markdown is baked into the prerendered output — the standalone
 * production bundle does not ship `src/content`.
 */
export async function loadLegalDocHtml(doc: LegalDoc, locale?: Locale): Promise<string> {
  const legalDir = path.join(process.cwd(), 'src', 'content', 'legal');
  const candidates = resolveLegalFileNames(doc, locale);
  let lastError: unknown;
  for (const fileName of candidates) {
    try {
      const markdown = await readFile(path.join(legalDir, fileName), 'utf8');
      return marked.parse(markdown, { async: false });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Legal document not found: ${doc} (${candidates.join(', ')})`);
}
