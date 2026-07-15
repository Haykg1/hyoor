import { Injectable } from '@nestjs/common';
import type { AiSearchPropertyResult } from '@repo/shared';
import type { AiSearchChatResponse, AiSearchMessage } from '@repo/shared';
import {
  findDestinationPoiByQuery,
  inferPropertyTypeFromText,
  localeToYandexLang,
  todayIsoUtc,
} from '@repo/shared';

import { GeocodingService } from '../geocoding/geocoding.service';
import { PropertiesService } from '../properties/properties.service';

import type { LlmCompletionResult } from './llm/llm.service';
import { LlmService } from './llm/llm.service';
import {
  buildSearchPathFromFilters,
  destinationPoiToResolvedLocation,
  fallbackResolvedLocation,
  placeToResolvedLocation,
  toExtractedFilters,
  toSearchPropertiesDto,
  type ResolvedLocation,
} from './mappers/ai-search-filters.mapper';
import { buildAiSearchInterpretation } from './utils/ai-search-interpretation';
import { alignSearchArgsWithUserText } from './utils/align-search-args';
import { AI_SEARCH_NO_MATCHES_SUFFIX, normalizeChatLocale } from './utils/chat-locale';

const AI_SEARCH_RESULT_LIMIT = 8;

function appendAiFlag(searchPath: string): string {
  if (searchPath.includes('ai=1')) return searchPath;
  return searchPath.includes('?') ? `${searchPath}&ai=1` : `${searchPath}?ai=1`;
}

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
    const response = await this.handleSearchTool(llmResult, messages, locale);
    return { response, tokensUsed: llmResult.usage.totalTokens };
  }

  private async handleSearchTool(
    llmResult: Extract<LlmCompletionResult, { kind: 'tool' }>,
    messages: AiSearchMessage[],
    locale: string,
  ): Promise<AiSearchChatResponse> {
    const chatLocale = normalizeChatLocale(locale);
    const lastUser = [...messages].reverse().find((item) => item.role === 'user')?.content;
    const args = alignSearchArgsWithUserText(llmResult.args, lastUser, todayIsoUtc());
    if (!args.propertyType && lastUser) {
      const inferred = inferPropertyTypeFromText(lastUser);
      if (inferred) args.propertyType = inferred;
    }
    const locationQuery = args.locationQuery?.trim();
    const location = locationQuery
      ? await this.resolveLocation(locationQuery, locale, lastUser)
      : fallbackResolvedLocation('');
    const filters = toExtractedFilters(args, location);
    if (!locationQuery) {
      delete filters.locationLabel;
      delete filters.searchCity;
      delete filters.region;
    }
    const searchDto = toSearchPropertiesDto(args, location);
    if (!locationQuery) {
      searchDto.searchCity = undefined;
      searchDto.city = undefined;
      searchDto.region = undefined;
    }
    searchDto.limit = AI_SEARCH_RESULT_LIMIT;
    const results = await this.propertiesService.search(searchDto);
    const properties: AiSearchPropertyResult[] = results.data.map((property) => {
      const suggested = results.suggestedDatesByPropertyId?.[property.id];
      if (!suggested) {
        return property;
      }
      return {
        ...property,
        suggestedCheckIn: suggested.suggestedCheckIn,
        suggestedCheckOut: suggested.suggestedCheckOut,
      };
    });
    const firstSuggested = properties.find(
      (property) => property.suggestedCheckIn && property.suggestedCheckOut,
    );
    const suggestedDates =
      firstSuggested?.suggestedCheckIn && firstSuggested.suggestedCheckOut
        ? {
            checkIn: firstSuggested.suggestedCheckIn,
            checkOut: firstSuggested.suggestedCheckOut,
          }
        : undefined;
    const searchPath = appendAiFlag(buildSearchPathFromFilters(filters, suggestedDates));
    const grounded = buildAiSearchInterpretation(filters, suggestedDates, chatLocale);
    const resultMessage =
      properties.length > 0 ? grounded : `${grounded}${AI_SEARCH_NO_MATCHES_SUFFIX[chatLocale]}`;
    return {
      type: 'search',
      message: resultMessage,
      filters,
      properties,
      searchPath,
    };
  }

  private async resolveLocation(
    locationQuery: string,
    locale: string,
    lastUserMessage?: string,
  ): Promise<ResolvedLocation> {
    const curated =
      findDestinationPoiByQuery(locationQuery) ??
      (lastUserMessage ? findDestinationPoiByQuery(lastUserMessage) : null);
    if (curated) {
      return destinationPoiToResolvedLocation(curated);
    }
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
