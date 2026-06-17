import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiSearchMessage,
  ProposeCalendarChangesToolArgs,
  SearchPropertiesToolArgs,
} from '@repo/shared';
import { PropertyTypes } from '@repo/shared';
import OpenAI from 'openai';

import type { AppConfig } from '../../config/configuration';
import { truncateAiSearchMessages } from '../utils/message-limits';

import { buildHostCalendarSuggestionsPrompt } from './host-calendar-suggestions-prompt';
import { buildHostCalendarSystemPrompt } from './host-calendar-system-prompt';
import type {
  HostCalendarLlmContext,
  HostCalendarLlmResult,
  HostCalendarSuggestionsLlmContext,
  HostCalendarSuggestionsLlmResult,
  LlmCompletionResult,
  LlmTokenUsage,
} from './llm.service';
import { LlmService } from './llm.service';
import {
  buildProposeCalendarChangesToolDefinition,
  PROPOSE_CALENDAR_CHANGES_TOOL_NAME,
} from './propose-calendar-changes.tool';
import {
  buildSearchPropertiesToolDefinition,
  SEARCH_PROPERTIES_TOOL_NAME,
} from './search-properties.tool';
import { buildAiSearchSystemPrompt } from './system-prompt';

@Injectable()
export class OpenAiLlmService extends LlmService {
  private readonly logger = new Logger(OpenAiLlmService.name);
  private readonly client: OpenAI | null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    super();
    const apiKey = this.config.get('openai.apiKey', { infer: true });
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async complete(messages: AiSearchMessage[], locale: string): Promise<LlmCompletionResult> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI search is not configured');
    }
    const model = this.config.get('openai.model', { infer: true });
    const maxContextMessages = this.config.get('aiSearch.maxContextMessages', { infer: true });
    const maxMessageChars = this.config.get('aiSearch.maxMessageChars', { infer: true });
    const maxCompletionTokens = this.config.get('aiSearch.maxCompletionTokens', { infer: true });
    const todayIso = new Date().toISOString().slice(0, 10);
    const contextMessages = truncateAiSearchMessages(messages, maxContextMessages, maxMessageChars);
    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildAiSearchSystemPrompt(todayIso, locale) },
        ...contextMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      tools: [buildSearchPropertiesToolDefinition()],
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: maxCompletionTokens,
    });
    const choice = completion.choices[0];
    if (!choice) {
      throw new ServiceUnavailableException('AI provider returned an empty response');
    }
    const usage = this.toTokenUsage(completion.usage);
    if (usage) {
      this.logger.debug(
        `OpenAI tokens prompt=${usage.promptTokens} completion=${usage.completionTokens}`,
      );
    }
    const toolCall = choice.message.tool_calls?.[0];
    if (toolCall?.type === 'function' && toolCall.function.name === SEARCH_PROPERTIES_TOOL_NAME) {
      const args = this.parseToolArgs(toolCall.function.arguments);
      const message =
        choice.message.content?.trim() || 'Here are some places that match your search.';
      return {
        kind: 'tool',
        message,
        args,
        usage: usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
    const clarifyMessage = choice.message.content?.trim();
    if (!clarifyMessage) {
      throw new ServiceUnavailableException('AI provider returned an empty message');
    }
    return {
      kind: 'clarify',
      message: clarifyMessage,
      usage: usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  async completeHostCalendar(
    messages: AiSearchMessage[],
    context: HostCalendarLlmContext,
  ): Promise<HostCalendarLlmResult> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI search is not configured');
    }
    const model = this.config.get('openai.model', { infer: true });
    const maxContextMessages = this.config.get('aiSearch.hostCalendarMaxContextMessages', {
      infer: true,
    });
    const maxMessageChars = this.config.get('aiSearch.maxMessageChars', { infer: true });
    const maxCompletionTokens = this.config.get('aiSearch.maxCompletionTokens', { infer: true });
    const todayIso = new Date().toISOString().slice(0, 10);
    const contextMessages = truncateAiSearchMessages(messages, maxContextMessages, maxMessageChars);
    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: buildHostCalendarSystemPrompt({
            todayIso,
            propertyTitle: context.propertyTitle,
            propertyId: context.propertyId,
            basePricePerNight: context.basePricePerNight,
            currency: context.currency,
            locale: context.locale,
          }),
        },
        ...contextMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      tools: [buildProposeCalendarChangesToolDefinition()],
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: maxCompletionTokens,
    });
    const choice = completion.choices[0];
    if (!choice) {
      throw new ServiceUnavailableException('AI provider returned an empty response');
    }
    const usage = this.toTokenUsage(completion.usage);
    const emptyUsage = usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const toolCall = choice.message.tool_calls?.[0];
    if (
      toolCall?.type === 'function' &&
      toolCall.function.name === PROPOSE_CALENDAR_CHANGES_TOOL_NAME
    ) {
      const args = this.parseCalendarToolArgs(toolCall.function.arguments);
      const message =
        choice.message.content?.trim() || 'Here is a preview of the calendar changes.';
      return { kind: 'calendar_proposal', message, args, usage: emptyUsage };
    }
    const clarifyMessage = choice.message.content?.trim();
    if (!clarifyMessage) {
      throw new ServiceUnavailableException('AI provider returned an empty message');
    }
    return { kind: 'clarify', message: clarifyMessage, usage: emptyUsage };
  }

  async generateHostCalendarSuggestions(
    context: HostCalendarSuggestionsLlmContext,
  ): Promise<HostCalendarSuggestionsLlmResult> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI search is not configured');
    }
    const model = this.config.get('openai.model', { infer: true });
    const maxCompletionTokens = this.config.get('aiSearch.maxCompletionTokens', { infer: true });
    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: buildHostCalendarSuggestionsPrompt(context),
        },
        {
          role: 'user',
          content: `Generate ${context.suggestionCount} calendar chat suggestions for this property.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: maxCompletionTokens,
    });
    const choice = completion.choices[0];
    if (!choice?.message.content?.trim()) {
      throw new ServiceUnavailableException('AI provider returned an empty response');
    }
    const usage = this.toTokenUsage(completion.usage);
    const emptyUsage = usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const suggestions = this.parseSuggestionsJson(choice.message.content);
    return { suggestions, usage: emptyUsage };
  }

  private parseSuggestionsJson(raw: string): string[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new ServiceUnavailableException('AI provider returned invalid suggestions');
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new ServiceUnavailableException('AI provider returned invalid suggestions');
    }
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.suggestions)) {
      throw new ServiceUnavailableException('AI provider returned invalid suggestions');
    }
    return record.suggestions
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseCalendarToolArgs(raw: string): ProposeCalendarChangesToolArgs {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new ServiceUnavailableException('AI provider returned invalid calendar parameters');
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new ServiceUnavailableException('AI provider returned invalid calendar parameters');
    }
    const record = parsed as Record<string, unknown>;
    const dateFrom = typeof record.dateFrom === 'string' ? record.dateFrom.trim() : '';
    const dateTo = typeof record.dateTo === 'string' ? record.dateTo.trim() : '';
    if (!dateFrom || !dateTo) {
      throw new ServiceUnavailableException('AI provider returned invalid calendar parameters');
    }
    const args: ProposeCalendarChangesToolArgs = { dateFrom, dateTo };
    if (typeof record.isAvailable === 'boolean') args.isAvailable = record.isAvailable;
    if (typeof record.priceOverride === 'number') {
      args.priceOverride = Math.floor(record.priceOverride);
    }
    if (typeof record.useBaseRate === 'boolean') args.useBaseRate = record.useBaseRate;
    return args;
  }

  private toTokenUsage(
    usage: OpenAI.Completions.CompletionUsage | undefined,
  ): LlmTokenUsage | undefined {
    if (!usage) return undefined;
    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };
  }

  private parseToolArgs(raw: string): SearchPropertiesToolArgs {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new ServiceUnavailableException('AI provider returned invalid search parameters');
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new ServiceUnavailableException('AI provider returned invalid search parameters');
    }
    const record = parsed as Record<string, unknown>;
    const args: SearchPropertiesToolArgs = {};
    if (typeof record.locationQuery === 'string') args.locationQuery = record.locationQuery.trim();
    if (typeof record.checkIn === 'string') args.checkIn = record.checkIn.trim();
    if (typeof record.checkOut === 'string') args.checkOut = record.checkOut.trim();
    if (typeof record.maxGuests === 'number') args.maxGuests = Math.floor(record.maxGuests);
    if (typeof record.minBedrooms === 'number') args.minBedrooms = Math.floor(record.minBedrooms);
    if (typeof record.minBeds === 'number') args.minBeds = Math.floor(record.minBeds);
    if (typeof record.minBathrooms === 'number')
      args.minBathrooms = Math.floor(record.minBathrooms);
    if (typeof record.minPrice === 'number') args.minPrice = Math.floor(record.minPrice);
    if (typeof record.maxPrice === 'number') args.maxPrice = Math.floor(record.maxPrice);
    if (
      typeof record.propertyType === 'string' &&
      PropertyTypes.includes(record.propertyType as never)
    ) {
      args.propertyType = record.propertyType as SearchPropertiesToolArgs['propertyType'];
    }
    if (Array.isArray(record.amenities)) {
      args.amenities = record.amenities.filter((a): a is string => typeof a === 'string');
    }
    if (typeof record.petsAllowed === 'boolean') args.petsAllowed = record.petsAllowed;
    if (typeof record.smokingAllowed === 'boolean') args.smokingAllowed = record.smokingAllowed;
    if (typeof record.partiesAllowed === 'boolean') args.partiesAllowed = record.partiesAllowed;
    if (typeof record.minAvgRating === 'number') args.minAvgRating = record.minAvgRating;
    if (typeof record.q === 'string') args.q = record.q.trim();
    return args;
  }
}
