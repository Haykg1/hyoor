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
import { isIsoDateInEditableWindow, maxEditableIsoDate, todayIsoUtc } from '@repo/shared';

import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { AvailabilityService } from '../../availability/availability.service';
import type { AppConfig } from '../../config/configuration';
import type { CurrencyRates } from '../../currency/currency.service';
import { CurrencyService } from '../../currency/currency.service';
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
  HOST_CALENDAR_OUT_OF_WINDOW_MESSAGES,
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
import {
  buildSuggestionPricingFromUsd,
  normalizeDisplayCurrency,
  type HostCalendarSuggestionPricing,
} from '../utils/host-calendar-suggestion-pricing';
import { finalizeHostCalendarSuggestions } from '../utils/host-calendar-suggestion-validator';

const HOST_CALENDAR_SUGGESTIONS_CACHE_PREFIX = 'ai-search:host-calendar:suggestions:';

function formatFxRatesHint(rates: CurrencyRates | null, settlementCurrency: string): string {
  if (!rates) {
    return `FX rates unavailable; if the host quotes a non-${settlementCurrency} currency, ask them to confirm the ${settlementCurrency} amount.`;
  }
  const parts = [`1 ${settlementCurrency} = 1 ${settlementCurrency}`];
  const amd = rates.rates['AMD'];
  const eur = rates.rates['EUR'];
  if (typeof amd === 'number') parts.push(`1 ${settlementCurrency} ≈ ${Math.round(amd)} AMD`);
  if (typeof eur === 'number') parts.push(`1 ${settlementCurrency} ≈ ${eur.toFixed(2)} EUR`);
  return `Live FX (approx): ${parts.join('; ')}. Convert host-quoted AMD/EUR to ${settlementCurrency} integers before setting priceOverride.`;
}

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
    private readonly currencyService: CurrencyService,
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
    const rates = await this.currencyService.getRates();
    const todayIso = todayIsoUtc();
    const llmContext: HostCalendarLlmContext = {
      propertyId,
      propertyTitle: property.title,
      basePricePerNight: property.pricePerNight,
      currency: property.currency,
      locale,
      fxRatesHint: formatFxRatesHint(rates, property.currency),
      todayIso,
      maxEditableIso: maxEditableIsoDate(todayIso),
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
    displayCurrencyRaw?: string,
  ): Promise<HostCalendarSuggestionsResponse> {
    const property = await this.assertHostOwnsProperty(propertyId, user.userId);
    const chatLocale = normalizeChatLocale(locale);
    const displayCurrency = normalizeDisplayCurrency(displayCurrencyRaw);
    const todayIso = todayIsoUtc();
    const cacheKey = `${HOST_CALENDAR_SUGGESTIONS_CACHE_PREFIX}${propertyId}:${chatLocale}:${displayCurrency}:${todayIso}`;
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
    const pricing = await this.resolveSuggestionPricing(property.pricePerNight, displayCurrency);
    let llmSuggestions: string[] = [];
    try {
      await this.quotaService.assertHostCalendarTokenBudget(user.userId);
      const llmResult = await this.llmService.generateHostCalendarSuggestions({
        locale: chatLocale,
        snapshot,
        suggestionCount,
        pricing,
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
      pricing,
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
    const todayIso = todayIsoUtc();
    const sorted = [...entries]
      .filter((e) => isIsoDateInEditableWindow(e.date, todayIso))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (entries.length > 0 && sorted.length === 0) {
      return { type: 'clarify', message: HOST_CALENDAR_OUT_OF_WINDOW_MESSAGES[chatLocale] };
    }
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
    const message = buildHostCalendarAppliedMessage(
      summary,
      property.title,
      chatLocale,
      property.currency,
    );
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
    const todayIso = todayIsoUtc();
    const inWindow = fullEntries.filter((entry) => isIsoDateInEditableWindow(entry.date, todayIso));
    if (inWindow.length === 0) {
      return {
        type: 'clarify',
        message: HOST_CALENDAR_OUT_OF_WINDOW_MESSAGES[normalizeChatLocale(locale)],
        quota,
      };
    }
    const dateFrom = inWindow[0]!.date;
    const dateTo = inWindow[inWindow.length - 1]!.date;
    const range = await this.availabilityService.getForRange(propertyId, dateFrom, dateTo);
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
    const delta = diffProposedVsCurrent(inWindow, currentByDate, basePricePerNight);
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
        dateFrom: delta[0]!.date,
        dateTo: delta[delta.length - 1]!.date,
      },
      quota,
    };
  }

  private async resolveSuggestionPricing(
    baseUsd: number,
    displayCurrency: ReturnType<typeof normalizeDisplayCurrency>,
  ): Promise<HostCalendarSuggestionPricing> {
    const rates = await this.currencyService.getRates();
    const convertUsdToDisplay =
      rates === null
        ? null
        : (amountUsd: number): number | null =>
            this.currencyService.convert(amountUsd, 'USD', displayCurrency, rates);
    return buildSuggestionPricingFromUsd(baseUsd, displayCurrency, convertUsdToDisplay);
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
