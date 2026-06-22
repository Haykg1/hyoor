import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiSearchQuota } from '@repo/shared';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

import { isVerifiedProfileForAiQuota } from './utils/verified-profile';

const HOST_CALENDAR_REQUEST_PREFIX = 'ai-search:host-calendar:';
const HOST_CALENDAR_TOKEN_PREFIX = 'ai-search:tokens:host-calendar:';
const GUEST_KEY_PREFIX = 'ai-search:guest:';
const USER_KEY_PREFIX = 'ai-search:user:';
const GUEST_TOKEN_KEY_PREFIX = 'ai-search:tokens:guest:';
const USER_TOKEN_KEY_PREFIX = 'ai-search:tokens:user:';

interface QuotaSubject {
  requestRedisKey: string;
  tokenRedisKey: string;
  requestLimit: number;
  tokenLimit: number;
  isAuthenticated: boolean;
  isVerifiedProfile: boolean;
}

@Injectable()
export class AiSearchQuotaService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  private get guestLimit(): number {
    return this.config.get('aiSearch.guestLimit', { infer: true });
  }

  private get verifiedUserLimit(): number {
    return this.config.get('aiSearch.verifiedUserLimit', { infer: true });
  }

  private get guestTtlSeconds(): number {
    return this.config.get('aiSearch.guestTtlSeconds', { infer: true });
  }

  private get guestDailyTokenLimit(): number {
    return this.config.get('aiSearch.guestDailyTokenLimit', { infer: true });
  }

  private get verifiedDailyTokenLimit(): number {
    return this.config.get('aiSearch.verifiedDailyTokenLimit', { infer: true });
  }

  private get hostCalendarLimit(): number {
    return this.config.get('aiSearch.hostCalendarLimit', { infer: true });
  }

  private get hostCalendarDailyTokenLimit(): number {
    return this.config.get('aiSearch.hostCalendarDailyTokenLimit', { infer: true });
  }

  private get hostCalendarTtlSeconds(): number {
    return this.config.get('aiSearch.hostCalendarTtlSeconds', { infer: true });
  }

  async getHostCalendarQuota(userId: string): Promise<AiSearchQuota> {
    this.assertRedisConfigured();
    const requestKey = `${HOST_CALENDAR_REQUEST_PREFIX}${userId}`;
    const tokenKey = `${HOST_CALENDAR_TOKEN_PREFIX}${userId}`;
    const used = await this.readUsedCount(requestKey);
    const tokensUsed = await this.readUsedCount(tokenKey);
    const resetsInSeconds = await this.readResetsInSeconds(requestKey);
    return {
      limit: this.hostCalendarLimit,
      used,
      remaining: Math.max(0, this.hostCalendarLimit - used),
      isAuthenticated: true,
      isVerifiedProfile: false,
      resetsInSeconds,
      tokenLimit: this.hostCalendarDailyTokenLimit,
      tokensUsed,
      tokensRemaining: Math.max(0, this.hostCalendarDailyTokenLimit - tokensUsed),
    };
  }

  async assertHostCalendarTokenBudget(userId: string): Promise<void> {
    this.assertRedisConfigured();
    const tokenKey = `${HOST_CALENDAR_TOKEN_PREFIX}${userId}`;
    const tokensUsed = await this.readUsedCount(tokenKey);
    if (tokensUsed >= this.hostCalendarDailyTokenLimit) {
      throw new HttpException(
        {
          message: 'Daily host calendar AI token budget reached. Try again tomorrow.',
          code: 'AI_SEARCH_TOKEN_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async consumeHostCalendarRequest(userId: string): Promise<AiSearchQuota> {
    this.assertRedisConfigured();
    const requestKey = `${HOST_CALENDAR_REQUEST_PREFIX}${userId}`;
    const count = await this.redis.incrWithTtl(requestKey, this.hostCalendarTtlSeconds);
    if (count > this.hostCalendarLimit) {
      await this.redis.decr(requestKey);
      throw new HttpException(
        {
          message: 'Host calendar AI limit reached for today.',
          code: 'AI_SEARCH_GUEST_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.getHostCalendarQuota(userId);
  }

  async recordHostCalendarTokenUsage(userId: string, totalTokens: number): Promise<AiSearchQuota> {
    if (totalTokens <= 0) {
      return this.getHostCalendarQuota(userId);
    }
    this.assertRedisConfigured();
    const tokenKey = `${HOST_CALENDAR_TOKEN_PREFIX}${userId}`;
    await this.redis.incrByWithTtl(tokenKey, totalTokens, this.hostCalendarTtlSeconds);
    return this.getHostCalendarQuota(userId);
  }

  async getQuota(clientIp: string, userId?: string): Promise<AiSearchQuota> {
    this.assertRedisConfigured();
    const subject = await this.resolveQuotaSubject(clientIp, userId);
    const used = await this.readUsedCount(subject.requestRedisKey);
    const tokensUsed = await this.readUsedCount(subject.tokenRedisKey);
    const resetsInSeconds = await this.readResetsInSeconds(subject.requestRedisKey);
    return this.buildQuota(subject, used, tokensUsed, resetsInSeconds);
  }

  async assertTokenBudget(clientIp: string, userId?: string): Promise<void> {
    this.assertRedisConfigured();
    const subject = await this.resolveQuotaSubject(clientIp, userId);
    const tokensUsed = await this.readUsedCount(subject.tokenRedisKey);
    if (tokensUsed >= subject.tokenLimit) {
      throw new HttpException(
        {
          message: 'Daily AI token budget reached. Try again tomorrow or refine your searches.',
          code: 'AI_SEARCH_TOKEN_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async consumeRequest(clientIp: string, userId?: string): Promise<AiSearchQuota> {
    this.assertRedisConfigured();
    const subject = await this.resolveQuotaSubject(clientIp, userId);
    const count = await this.redis.incrWithTtl(subject.requestRedisKey, this.guestTtlSeconds);
    if (count > subject.requestLimit) {
      await this.redis.decr(subject.requestRedisKey);
      throw new HttpException(
        {
          message: subject.isAuthenticated
            ? 'AI search limit reached for your account.'
            : 'Guest AI search limit reached. Sign up for more requests.',
          code: 'AI_SEARCH_GUEST_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const tokensUsed = await this.readUsedCount(subject.tokenRedisKey);
    const resetsInSeconds = await this.readResetsInSeconds(subject.requestRedisKey);
    return this.buildQuota(subject, count, tokensUsed, resetsInSeconds);
  }

  async recordTokenUsage(
    clientIp: string,
    userId: string | undefined,
    totalTokens: number,
  ): Promise<AiSearchQuota> {
    if (totalTokens <= 0) {
      return this.getQuota(clientIp, userId);
    }
    this.assertRedisConfigured();
    const subject = await this.resolveQuotaSubject(clientIp, userId);
    await this.redis.incrByWithTtl(subject.tokenRedisKey, totalTokens, this.guestTtlSeconds);
    const used = await this.readUsedCount(subject.requestRedisKey);
    const tokensUsed = await this.readUsedCount(subject.tokenRedisKey);
    const resetsInSeconds = await this.readResetsInSeconds(subject.requestRedisKey);
    return this.buildQuota(subject, used, tokensUsed, resetsInSeconds);
  }

  private async resolveQuotaSubject(clientIp: string, userId?: string): Promise<QuotaSubject> {
    if (!userId) {
      return {
        requestRedisKey: `${GUEST_KEY_PREFIX}${clientIp}`,
        tokenRedisKey: `${GUEST_TOKEN_KEY_PREFIX}${clientIp}`,
        requestLimit: this.guestLimit,
        tokenLimit: this.guestDailyTokenLimit,
        isAuthenticated: false,
        isVerifiedProfile: false,
      };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }
    const isVerifiedProfile = isVerifiedProfileForAiQuota(user);
    return {
      requestRedisKey: `${USER_KEY_PREFIX}${userId}`,
      tokenRedisKey: `${USER_TOKEN_KEY_PREFIX}${userId}`,
      requestLimit: isVerifiedProfile ? this.verifiedUserLimit : this.guestLimit,
      tokenLimit: isVerifiedProfile ? this.verifiedDailyTokenLimit : this.guestDailyTokenLimit,
      isAuthenticated: true,
      isVerifiedProfile,
    };
  }

  private buildQuota(
    subject: QuotaSubject,
    used: number,
    tokensUsed: number,
    resetsInSeconds?: number,
  ): AiSearchQuota {
    return {
      limit: subject.requestLimit,
      used,
      remaining: Math.max(0, subject.requestLimit - used),
      isAuthenticated: subject.isAuthenticated,
      isVerifiedProfile: subject.isVerifiedProfile,
      resetsInSeconds,
      tokenLimit: subject.tokenLimit,
      tokensUsed,
      tokensRemaining: Math.max(0, subject.tokenLimit - tokensUsed),
    };
  }

  private assertRedisConfigured(): void {
    if (!this.redis.isConfigured) {
      throw new HttpException(
        'AI search quota service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async readUsedCount(key: string): Promise<number> {
    const raw = await this.redis.get(key);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async readResetsInSeconds(key: string): Promise<number | undefined> {
    const ttl = await this.redis.ttl(key);
    if (ttl <= 0) return undefined;
    return ttl;
  }

  async assertBulkImportLimit(userId: string): Promise<void> {
    if (!this.redis.isConfigured) return;
    const limit = this.config.get('aiSearch.bulkImportLimit', { infer: true });
    const ttl = this.config.get('aiSearch.bulkImportTtlSeconds', { infer: true });
    const key = `ai-search:bulk-import:${userId}`;
    const count = await this.redis.incrWithTtl(key, ttl);
    if (count > limit) {
      await this.redis.decr(key);
      throw new HttpException(
        {
          message: `Bulk import analyze limit (${limit}/day) reached. Try again tomorrow.`,
          code: 'BULK_IMPORT_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
