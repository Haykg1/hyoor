import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { findDestinationPoiByQuery, localeToYandexLang } from '@repo/shared';

import {
  buildSearchPathFromFilters,
  destinationPoiToResolvedLocation,
  fallbackResolvedLocation,
  placeToResolvedLocation,
  toExtractedFilters,
  toSearchPropertiesDto,
  type ResolvedLocation,
} from '../ai-search/mappers/ai-search-filters.mapper';
import type { AppConfig } from '../config/configuration';
import { GeocodingService } from '../geocoding/geocoding.service';
import { PropertiesService } from '../properties/properties.service';

import {
  buildPropertyPageUrl,
  buildSearchPageUrl,
  toListingCard,
  toListingDetail,
} from './mcp-listing.mapper';
import { MCP_RESULT_LIMIT } from './mcp.constants';
import type {
  McpGetListingArgs,
  McpListingDetail,
  McpSearchListingsArgs,
  McpSearchListingsResult,
} from './mcp.types';

@Injectable()
export class McpListingsService {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly geocodingService: GeocodingService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Search public listings and return compact cards with website urls.
   */
  async searchListings(args: McpSearchListingsArgs): Promise<McpSearchListingsResult> {
    const locale = args.locale;
    const locationQuery = args.locationQuery?.trim();
    const location = locationQuery
      ? await this.resolveLocation(locationQuery, locale)
      : fallbackResolvedLocation('');
    const filters = toExtractedFilters(args, location);
    const searchDto = toSearchPropertiesDto(args, location);
    if (!locationQuery) {
      delete filters.locationLabel;
      delete filters.searchCity;
      delete filters.region;
      searchDto.searchCity = undefined;
      searchDto.city = undefined;
      searchDto.region = undefined;
    }
    searchDto.limit = MCP_RESULT_LIMIT;
    const results = await this.propertiesService.search(searchDto);
    const frontendUrl = this.config.get('frontend.url', { infer: true });
    const listings = results.data.map((property) => {
      const suggested = results.suggestedDatesByPropertyId?.[property.id];
      return toListingCard(
        property,
        buildPropertyPageUrl(frontendUrl, locale ?? 'en', property.id),
        suggested
          ? { checkIn: suggested.suggestedCheckIn, checkOut: suggested.suggestedCheckOut }
          : undefined,
      );
    });
    const firstSuggested = listings.find(
      (listing) => listing.suggestedCheckIn && listing.suggestedCheckOut,
    );
    const suggestedDates =
      firstSuggested?.suggestedCheckIn && firstSuggested.suggestedCheckOut
        ? { checkIn: firstSuggested.suggestedCheckIn, checkOut: firstSuggested.suggestedCheckOut }
        : undefined;
    const searchPath = buildSearchPathFromFilters(filters, suggestedDates);
    return {
      total: results.total,
      listings,
      searchUrl: buildSearchPageUrl(frontendUrl, locale ?? 'en', searchPath),
    };
  }

  /**
   * Return public listing detail, or null when the listing is missing / not public.
   */
  async getListing(args: McpGetListingArgs): Promise<McpListingDetail | null> {
    const frontendUrl = this.config.get('frontend.url', { infer: true });
    try {
      const property = await this.propertiesService.findById(args.id);
      return toListingDetail(
        property,
        buildPropertyPageUrl(frontendUrl, args.locale ?? 'en', property.id),
      );
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      if (error instanceof HttpException && error.getStatus() === 404) return null;
      throw error;
    }
  }

  private async resolveLocation(locationQuery: string, locale?: string): Promise<ResolvedLocation> {
    const curated = findDestinationPoiByQuery(locationQuery);
    if (curated) {
      return destinationPoiToResolvedLocation(curated);
    }
    try {
      const places = await this.geocodingService.searchPlaces(
        locationQuery,
        'any',
        localeToYandexLang(locale ?? 'en'),
      );
      const place = places[0];
      if (place) {
        return placeToResolvedLocation(place);
      }
    } catch {
      // Geocoding unavailable — fall back to text city match.
    }
    return fallbackResolvedLocation(locationQuery);
  }
}
