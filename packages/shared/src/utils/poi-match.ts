import { DESTINATION_DATASETS } from '../data/poi-datasets';
import type { PoiDestination } from '../types/poi';

const NEAR_PREFIX_RE = /^(near|nearby|close to|возле|около|рядом с|մոտ|մոտակայքում)\s+/iu;

/** Normalize landmark queries for case-insensitive POI matching. */
export function normalizePoiMatchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripNearPrefix(normalized: string): string {
  return normalized.replace(NEAR_PREFIX_RE, '').trim();
}

function destinationLabels(destination: PoiDestination): string[] {
  return [
    destination.id.replace(/_/g, ' '),
    destination.nameLabels.en,
    destination.nameLabels.hy,
    destination.nameLabels.ru,
  ]
    .map((label) => normalizePoiMatchText(label))
    .filter((label) => label.length > 0);
}

function containsAsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (haystack === needle) return true;
  return ` ${haystack} `.includes(` ${needle} `);
}

function matchScore(normalizedQuery: string, label: string): number | null {
  if (normalizedQuery === label) return label.length + 1000;
  // Query may include city suffix ("republic square yerevan"); require the label
  // as a phrase inside the query — never match a short city query inside a long label.
  if (label.length >= 3 && containsAsPhrase(normalizedQuery, label)) {
    return label.length;
  }
  return null;
}

/**
 * Match a free-text location query to a curated destination POI (landmark).
 * Supports EN/HY/RU labels, id slugs, and light "near X" prefixes.
 */
export function findDestinationPoiByQuery(query: string): PoiDestination | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const normalized = stripNearPrefix(normalizePoiMatchText(trimmed));
  if (!normalized) return null;
  let best: { destination: PoiDestination; score: number } | null = null;
  for (const dataset of DESTINATION_DATASETS) {
    for (const destination of dataset.destinations) {
      for (const label of destinationLabels(destination)) {
        const score = matchScore(normalized, label);
        if (score === null) continue;
        if (!best || score > best.score) {
          best = { destination, score };
        }
      }
    }
  }
  return best?.destination ?? null;
}
