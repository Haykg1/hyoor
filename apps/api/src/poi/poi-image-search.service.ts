import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v2/search';
const SEARCH_TIMEOUT_MS = 8000;
const DEFAULT_LIMIT = 6;

/**
 * Admin-only helper: given a place query, return candidate image URLs a human can
 * review before attaching one to a POI. Not used in the guest trip-plan path.
 */
@Injectable()
export class PoiImageSearchService {
  private readonly logger = new Logger(PoiImageSearchService.name);
  private readonly apiKey: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.apiKey = config.get('firecrawl.apiKey', { infer: true });
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async searchImages(query: string, limit = DEFAULT_LIMIT): Promise<string[]> {
    if (!this.apiKey || !query.trim()) return [];
    try {
      const response = await fetch(FIRECRAWL_SEARCH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim(), sources: ['images'], limit }),
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Firecrawl image search failed (${response.status}) for ${query}`);
        return [];
      }
      const payload: unknown = await response.json();
      return extractHttpsImageUrls(payload).slice(0, limit);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Firecrawl image search error for ${query}: ${message}`);
      return [];
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isHttpsUrl(value: string): boolean {
  if (!value.startsWith('https://')) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function extractHttpsImageUrls(payload: unknown): string[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const images = Array.isArray(data?.images)
    ? data.images
    : Array.isArray(root?.images)
      ? root.images
      : [];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const entry of images) {
    const record = asRecord(entry);
    const candidate = asString(record?.imageUrl) || asString(record?.url);
    if (!isHttpsUrl(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    urls.push(candidate);
  }
  return urls;
}
