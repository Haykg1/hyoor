import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Property } from '@repo/database/client';
import type {
  AiSearchMessage,
  HostCalendarChangeEntry,
  HostCalendarChatResponse,
  HostCalendarSuggestionsResponse,
  ProposeCalendarChangesToolArgs,
} from '@repo/shared';

import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { AvailabilityService } from '../../availability/availability.service';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import { HostProfilesService } from '../../host-profiles/host-profiles.service';
import { RedisService } from '../../redis/redis.service';
import { AiSearchQuotaService } from '../ai-search-quota.service';
import type { HostCalendarLlmContext } from '../llm/llm.service';
import { LlmService } from '../llm/llm.service';
import {
  type CalendarDayState,
  diffProposedVsCurrent,
  expandDateRangeToEntries,
} from '../utils/calendar-range';
import {
  buildHostCalendarAppliedMessage,
  HOST_CALENDAR_ALL_BOOKED_MESSAGES,
  HOST_CALENDAR_ALREADY_APPLIED_MESSAGES,
  HOST_CALENDAR_NO_CHANGES_MESSAGES,
  HOST_CALENDAR_REVERT_HINTS,
  normalizeChatLocale,
} from '../utils/chat-locale';
import {
  evaluateHostCalendarMessage,
  type HostCalendarGuardContext,
} from '../utils/host-calendar-input-guard';
import {
  addDaysIso,
  buildHostCalendarSnapshot,
  type HostCalendarPropertySnapshot,
} from '../utils/host-calendar-snapshot';
import { finalizeHostCalendarSuggestions } from '../utils/host-calendar-suggestion-validator';

const HOST_CALENDAR_SUGGESTIONS_CACHE_PREFIX = 'ai-search:host-calendar:suggestions:';

@Injectable()
export class HostCalendarService {
  private readonly logger = new Logger(HostCalendarService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly availabilityService: AvailabilityService,
    private readonly hostProfilesService: HostProfilesService,
    private readonly prisma: PrismaService,
    private readonly quotaService: AiSearchQuotaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async chat(
    propertyId: string,
    user: RequestUser,
    messages: AiSearchMessage[],
    locale = 'en',
  ): Promise<HostCalendarChatResponse> {
    const property = await this.assertHostOwnsProperty(propertyId, user.userId);
    const guardContext = await this.buildGuardContext(propertyId, user.userId, property);
    const guard = evaluateHostCalendarMessage(messages, guardContext, locale);
    if (!guard.allowed) {
      const quota = await this.quotaService.getHostCalendarQuota(user.userId);
      return { type: 'clarify', message: guard.message, quota };
    }
    await this.quotaService.assertHostCalendarTokenBudget(user.userId);
    await this.quotaService.consumeHostCalendarRequest(user.userId);
    const llmContext: HostCalendarLlmContext = {
      propertyId,
      propertyTitle: property.title,
      basePricePerNight: property.pricePerNight,
      currency: property.currency,
      locale,
    };
    const llmResult = await this.llmService.completeHostCalendar(messages, llmContext);
    await this.quotaService.recordHostCalendarTokenUsage(user.userId, llmResult.usage.totalTokens);
    const quota = await this.quotaService.getHostCalendarQuota(user.userId);
    if (llmResult.kind === 'clarify') {
      return { type: 'clarify', message: llmResult.message, quota };
    }
    return this.buildProposalResponse(
      propertyId,
      property.pricePerNight,
      llmResult.args,
      llmResult.message,
      quota,
      locale,
    );
  }

  async getSuggestions(
    propertyId: string,
    user: RequestUser,
    locale = 'en',
  ): Promise<HostCalendarSuggestionsResponse> {
    const property = await this.assertHostOwnsProperty(propertyId, user.userId);
    const chatLocale = normalizeChatLocale(locale);
    const todayIso = new Date().toISOString().slice(0, 10);
    const cacheKey = `${HOST_CALENDAR_SUGGESTIONS_CACHE_PREFIX}${propertyId}:${chatLocale}:${todayIso}`;
    if (this.redis.isConfigured) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as HostCalendarSuggestionsResponse;
          if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
            return parsed;
          }
        } catch {
          this.logger.warn(`Invalid host calendar suggestions cache for ${propertyId}`);
        }
      }
    }
    const guardContext = await this.buildGuardContext(propertyId, user.userId, property);
    const suggestionCount = this.config.get('aiSearch.hostCalendarSuggestionsCount', {
      infer: true,
    });
    const rangeDays = this.config.get('aiSearch.hostCalendarSuggestionsRangeDays', {
      infer: true,
    });
    const rangeTo = addDaysIso(todayIso, rangeDays);
    const range = await this.availabilityService.getForRange(propertyId, todayIso, rangeTo);
    const propertySnapshot: HostCalendarPropertySnapshot = {
      title: property.title,
      city: property.city,
      propertyType: property.propertyType,
      minNights: property.minNights,
      basePricePerNight: property.pricePerNight,
      currency: property.currency,
    };
    const snapshot = buildHostCalendarSnapshot(
      propertySnapshot,
      range.entries,
      todayIso,
      rangeDays,
    );
    let llmSuggestions: string[] = [];
    try {
      await this.quotaService.assertHostCalendarTokenBudget(user.userId);
      const llmResult = await this.llmService.generateHostCalendarSuggestions({
        locale: chatLocale,
        snapshot,
        suggestionCount,
      });
      await this.quotaService.recordHostCalendarTokenUsage(
        user.userId,
        llmResult.usage.totalTokens,
      );
      llmSuggestions = llmResult.suggestions;
    } catch (error) {
      this.logger.warn(
        `Host calendar suggestions LLM failed for ${propertyId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
    const suggestions = finalizeHostCalendarSuggestions(
      llmSuggestions,
      snapshot,
      guardContext,
      chatLocale,
      suggestionCount,
    );
    const response: HostCalendarSuggestionsResponse = { suggestions };
    if (this.redis.isConfigured) {
      const ttl = this.config.get('aiSearch.hostCalendarTtlSeconds', { infer: true });
      await this.redis.setWithTtl(cacheKey, JSON.stringify(response), ttl);
    }
    return response;
  }

  async confirm(
    propertyId: string,
    user: RequestUser,
    entries: HostCalendarChangeEntry[],
    locale = 'en',
  ): Promise<HostCalendarChatResponse> {
    const chatLocale = normalizeChatLocale(locale);
    const property = await this.assertHostOwnsProperty(propertyId, user.userId);
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) {
      return { type: 'clarify', message: HOST_CALENDAR_NO_CHANGES_MESSAGES[chatLocale] };
    }
    const dateFrom = sorted[0]!.date;
    const dateTo = sorted[sorted.length - 1]!.date;
    const range = await this.availabilityService.getForRange(propertyId, dateFrom, dateTo);
    const blockedDates = new Set(
      range.entries.filter((e) => e.isBlockedByBooking).map((e) => e.date),
    );
    const applicable = sorted.filter((e) => !blockedDates.has(e.date));
    const skippedBookedCount = sorted.length - applicable.length;
    if (applicable.length === 0) {
      return {
        type: 'clarify',
        message: HOST_CALENDAR_ALL_BOOKED_MESSAGES[chatLocale],
      };
    }
    const dtoEntries = applicable.map((e) => ({
      date: e.date,
      isAvailable: e.isAvailable,
      priceOverride: e.priceOverride ?? undefined,
    }));
    await this.availabilityService.bulkUpsert(propertyId, user.userId, user.role, dtoEntries);
    const first = applicable[0]!;
    const summary = {
      appliedCount: applicable.length,
      skippedBookedCount,
      dateFrom,
      dateTo,
      isAvailable: first.isAvailable,
      priceOverride: first.priceOverride ?? null,
    };
    const message = buildHostCalendarAppliedMessage(summary, property.title, chatLocale);
    const quota = await this.quotaService.getHostCalendarQuota(user.userId);
    return {
      type: 'calendar_applied',
      message,
      appliedSummary: summary,
      revertHint: HOST_CALENDAR_REVERT_HINTS[chatLocale],
      quota,
    };
  }

  private async buildProposalResponse(
    propertyId: string,
    basePricePerNight: number,
    args: ProposeCalendarChangesToolArgs,
    llmMessage: string,
    quota: HostCalendarChatResponse['quota'],
    locale: string,
  ): Promise<HostCalendarChatResponse> {
    const isAvailable = args.isAvailable ?? true;
    const priceOverride = args.useBaseRate ? null : args.priceOverride;
    const fullEntries = expandDateRangeToEntries(
      args.dateFrom,
      args.dateTo,
      isAvailable,
      args.useBaseRate ? null : priceOverride,
    );
    const range = await this.availabilityService.getForRange(
      propertyId,
      args.dateFrom,
      args.dateTo,
    );
    const currentByDate = new Map<string, CalendarDayState>(
      range.entries.map((e) => [
        e.date,
        {
          date: e.date,
          isAvailable: e.isAvailable,
          isBlockedByBooking: e.isBlockedByBooking,
          priceOverride: e.priceOverride,
        },
      ]),
    );
    const delta = diffProposedVsCurrent(fullEntries, currentByDate, basePricePerNight);
    if (delta.length === 0) {
      return {
        type: 'already_applied',
        message: HOST_CALENDAR_ALREADY_APPLIED_MESSAGES[normalizeChatLocale(locale)],
        quota,
      };
    }
    return {
      type: 'calendar_preview',
      message: llmMessage,
      proposedChanges: {
        entries: delta,
        dateFrom: args.dateFrom,
        dateTo: args.dateTo,
      },
      quota,
    };
  }

  private async buildGuardContext(
    propertyId: string,
    userId: string,
    property: { title: string; city: string },
  ): Promise<HostCalendarGuardContext> {
    const hostProfile = await this.hostProfilesService.findByUserId(userId);
    const others = await this.prisma.property.findMany({
      where: { hostId: hostProfile.id, id: { not: propertyId } },
      select: { title: true },
    });
    return {
      currentPropertyTitle: property.title,
      currentPropertyCity: property.city,
      otherPropertyTitles: others.map((p) => p.title),
    };
  }

  private async assertHostOwnsProperty(propertyId: string, userId: string): Promise<Property> {
    const hostProfile = await this.hostProfilesService.findByUserId(userId);
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.hostId !== hostProfile.id) {
      throw new ForbiddenException('You do not own this property');
    }
    return property;
  }
}
