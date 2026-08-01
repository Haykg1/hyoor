import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { marked } from 'marked';

export type LegalDoc = 'terms-of-service' | 'privacy-policy';

/**
 * Reads a legal markdown document and renders it to HTML at build time.
 * Pages using this must be statically rendered (`dynamic = 'force-static'`)
 * so the markdown is baked into the prerendered output — the standalone
 * production bundle does not ship `src/content`.
 */
export async function loadLegalDocHtml(doc: LegalDoc): Promise<string> {
  const filePath = path.join(process.cwd(), 'src', 'content', 'legal', `${doc}.md`);
  const markdown = await readFile(filePath, 'utf8');
  return marked.parse(markdown, { async: false });
}
