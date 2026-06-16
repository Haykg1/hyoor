import { Injectable } from '@nestjs/common';
import type { AiSearchChatResponse, AiSearchMessage } from '@repo/shared';
import { localeToYandexLang } from '@repo/shared';

import { GeocodingService } from '../geocoding/geocoding.service';
import { PropertiesService } from '../properties/properties.service';

import type { LlmCompletionResult } from './llm/llm.service';
import { LlmService } from './llm/llm.service';
import {
  buildSearchPathFromFilters,
  fallbackResolvedLocation,
  hasRequiredSearchFields,
  placeToResolvedLocation,
  toExtractedFilters,
  toSearchPropertiesDto,
  type ResolvedLocation,
} from './mappers/ai-search-filters.mapper';
import {
  AI_SEARCH_MISSING_FIELDS_MESSAGES,
  AI_SEARCH_NO_MATCHES_SUFFIX,
  normalizeChatLocale,
} from './utils/chat-locale';

const AI_SEARCH_RESULT_LIMIT = 8;

export interface AiSearchChatResult {
  response: AiSearchChatResponse;
  tokensUsed: number;
}

@Injectable()
export class AiSearchService {
  constructor(
    private readonly llmService: LlmService,
    private readonly geocodingService: GeocodingService,
    private readonly propertiesService: PropertiesService,
  ) {}

  async chat(messages: AiSearchMessage[], locale = 'en'): Promise<AiSearchChatResult> {
    const llmResult = await this.llmService.complete(messages, locale);
    if (llmResult.kind === 'clarify') {
      return {
        response: { type: 'clarify', message: llmResult.message },
        tokensUsed: llmResult.usage.totalTokens,
      };
    }
    const response = await this.handleSearchTool(llmResult, locale);
    return { response, tokensUsed: llmResult.usage.totalTokens };
  }

  private async handleSearchTool(
    llmResult: Extract<LlmCompletionResult, { kind: 'tool' }>,
    locale: string,
  ): Promise<AiSearchChatResponse> {
    const chatLocale = normalizeChatLocale(locale);
    const { args, message } = llmResult;
    if (!hasRequiredSearchFields(args)) {
      return {
        type: 'clarify',
        message: AI_SEARCH_MISSING_FIELDS_MESSAGES[chatLocale],
      };
    }
    const location = await this.resolveLocation(args.locationQuery!.trim(), locale);
    const filters = toExtractedFilters(args, location);
    const searchDto = toSearchPropertiesDto(args, location);
    searchDto.limit = AI_SEARCH_RESULT_LIMIT;
    const results = await this.propertiesService.search(searchDto);
    const searchPath = buildSearchPathFromFilters(filters);
    const resultMessage =
      results.data.length > 0 ? message : `${message}${AI_SEARCH_NO_MATCHES_SUFFIX[chatLocale]}`;
    return {
      type: 'search',
      message: resultMessage,
      filters,
      properties: results.data,
      searchPath,
    };
  }

  private async resolveLocation(locationQuery: string, locale: string): Promise<ResolvedLocation> {
    try {
      const places = await this.geocodingService.searchPlaces(
        locationQuery,
        'any',
        localeToYandexLang(locale),
      );
      if (places.length > 0) {
        const place = places[0];
        if (place) {
          return placeToResolvedLocation(place);
        }
      }
    } catch {
      // Geocoding unavailable or misconfigured — fall back to text city match.
    }
    return fallbackResolvedLocation(locationQuery);
  }
}
