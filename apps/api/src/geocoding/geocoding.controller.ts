import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { SearchPlacesResponse } from '@repo/shared';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { GEOCODING_THROTTLE } from '../common/throttle/throttle.constants';

import { SearchPlacesDto } from './dto/search-places.dto';
import { GeocodingService } from './geocoding.service';

@ApiTags('geocoding')
@Controller('geocoding')
@Throttle(GEOCODING_THROTTLE)
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search places in Armenia via Yandex Geocoder' })
  @ApiOkResponse({ description: 'Matching Armenian places' })
  @ApiStandardErrors({ auth: false, throttle: true })
  search(@Query() dto: SearchPlacesDto): Promise<SearchPlacesResponse> {
    return this.geocodingService
      .searchPlaces(dto.q, dto.level ?? 'any')
      .then((places) => ({ places }));
  }
}
