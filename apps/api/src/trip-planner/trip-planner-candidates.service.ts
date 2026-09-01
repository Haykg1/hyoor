import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildPlannerCandidateVersionKey, parsePoiAttributes } from '@repo/shared';

import type { AppConfig } from '../config/configuration';
import {
  parseDescriptionLabels,
  parseNameLabels,
  toCoord,
  type PoiRecord,
} from '../poi/poi-mapper';
import { PoiService } from '../poi/poi.service';
import { RedisService } from '../redis/redis.service';

import { isMealCategory } from './poi-kind';

/** Compact POI shape handed to the model — no long text, ~30 tokens each. */
export interface CompactCandidate {
  n: number;
  poiId: string;
  name: string;
  category: string;
  tags: string[];
  desc: string;
  priceBand: string | null;
  servesAlcohol: boolean | null;
  durationMin: number | null;
  isMeal: boolean;
  lat: number;
  lng: number;
}

const CACHE_PREFIX = 'trip-planner:candidates:v1:';
const VERSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const DESC_MAX_CHARS = 140;

@Injectable()
export class TripPlannerCandidatesService {
  private readonly logger = new Logger(TripPlannerCandidatesService.name);

  constructor(
    private readonly poiService: PoiService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async getCandidates(citySlug: string, tags: string[], limit: number): Promise<PoiRecord[]> {
    if (!this.redis.isConfigured) {
      return this.poiService.listPlannerCandidates({ citySlug, tags, limit });
    }
    const signature = tags.length > 0 ? [...tags].sort().join(',') : 'all';
    const version = await this.readVersion(citySlug);
    const key = `${CACHE_PREFIX}${citySlug}:${version}:${signature}:${limit}`;
    const cached = await this.safeGet(key);
    if (cached) {
      const parsed = this.safeParse(cached);
      if (parsed) return parsed;
    }
    const rows = await this.poiService.listPlannerCandidates({ citySlug, tags, limit });
    const ttl = this.config.get('tripPlanner.candidateCacheTtlSeconds', { infer: true });
    if (ttl > 0) await this.safeSet(key, JSON.stringify(rows), ttl);
    return rows;
  }

  toCompact(records: PoiRecord[]): CompactCandidate[] {
    return records.map((poi, index) => {
      const attributes = parsePoiAttributes(poi.attributes);
      const name = parseNameLabels(poi.nameLabels);
      const description = parseDescriptionLabels(poi.descriptionLabels);
      const desc = (description.en || '').trim();
      return {
        n: index + 1,
        poiId: poi.id,
        name: name.en || poi.id,
        category: poi.category,
        tags: Array.isArray(poi.tags) ? poi.tags : [],
        desc: desc.length > DESC_MAX_CHARS ? `${desc.slice(0, DESC_MAX_CHARS)}…` : desc,
        priceBand: attributes.priceBand ?? null,
        servesAlcohol: attributes.servesAlcohol ?? null,
        durationMin: attributes.typicalDurationMin ?? null,
        isMeal: isMealCategory(poi.category),
        lat: round5(toCoord(poi.latitude)),
        lng: round5(toCoord(poi.longitude)),
      };
    });
  }

  private async readVersion(citySlug: string): Promise<string> {
    const raw = await this.safeGet(buildPlannerCandidateVersionKey(citySlug));
    return raw ?? '0';
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.warn(`Candidate cache read failed: ${asMessage(error)}`);
      return null;
    }
  }

  private async safeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setWithTtl(key, value, ttlSeconds);
    } catch (error) {
      this.logger.warn(`Candidate cache write failed: ${asMessage(error)}`);
    }
  }

  private safeParse(raw: string): PoiRecord[] | null {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as PoiRecord[]) : null;
    } catch {
      return null;
    }
  }
}

export { VERSION_TTL_SECONDS as PLANNER_CANDIDATE_VERSION_TTL_SECONDS };

function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
