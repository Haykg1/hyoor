import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { NearbyPoisResponse, NearestMetroResponse } from '@repo/shared';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { GEOCODING_THROTTLE } from '../common/throttle/throttle.constants';

import { NearbyDestinationsQueryDto } from './dto/nearby-destinations-query.dto';
import { NearestMetroQueryDto } from './dto/nearest-metro-query.dto';
import { PoiService } from './poi.service';

@ApiTags('poi')
@Controller('poi')
@Throttle(GEOCODING_THROTTLE)
export class PoiController {
  constructor(private readonly poiService: PoiService) {}

  @Get('nearest-metro')
  @ApiOperation({ summary: 'Find nearest metro station to a coordinate in Armenia' })
  @ApiOkResponse({ description: 'Nearest metro station with approximate walking distance' })
  @ApiStandardErrors({ auth: false, throttle: true })
  findNearestMetro(@Query() dto: NearestMetroQueryDto): Promise<NearestMetroResponse> {
    return this.poiService.findNearestMetro(
      dto.latitude,
      dto.longitude,
      dto.city,
      dto.region ?? null,
    );
  }

  @Get('nearby-destinations')
  @ApiOperation({ summary: 'List destination POIs near a coordinate, sorted by distance' })
  @ApiOkResponse({ description: 'All catalog POIs for the resolved city with distances' })
  @ApiStandardErrors({ auth: false, throttle: true })
  findNearbyDestinations(@Query() dto: NearbyDestinationsQueryDto): Promise<NearbyPoisResponse> {
    return this.poiService.findNearbyDestinations(
      dto.latitude,
      dto.longitude,
      dto.city,
      dto.region ?? null,
    );
  }
}
