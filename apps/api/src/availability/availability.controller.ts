import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import {
  AvailabilityService,
  type AvailabilityDayView,
  type AvailabilityRangeResponse,
} from './availability.service';
import { BulkUpsertAvailabilityDto } from './dto/bulk-upsert-availability.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':propertyId/blocked')
  @ApiOperation({ summary: 'Get blocked (unavailable) dates for a property in a date range' })
  @ApiOkResponse({ description: 'List of blocked ISO date strings' })
  @ApiStandardErrors({ auth: false, notFound: true })
  getBlockedDates(
    @Param('propertyId') propertyId: string,
    @Query() query: GetAvailabilityDto,
  ): Promise<{ dates: string[] }> {
    return this.availabilityService
      .getBlockedDates(propertyId, query.from, query.to)
      .then((dates) => ({ dates }));
  }

  @Get(':propertyId')
  @ApiOperation({ summary: 'Get availability calendar for a property in a date range' })
  @ApiOkResponse({ description: 'Daily availability with optional price overrides' })
  @ApiStandardErrors({ auth: false, notFound: true })
  getForRange(
    @Param('propertyId') propertyId: string,
    @Query() query: GetAvailabilityDto,
  ): Promise<AvailabilityRangeResponse> {
    return this.availabilityService.getForRange(propertyId, query.from, query.to);
  }

  @Put(':propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk upsert availability entries for a property (host owner only)' })
  @ApiOkResponse({ description: 'Updated availability entries' })
  @ApiStandardErrors({ notFound: true })
  bulkUpsert(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkUpsertAvailabilityDto,
  ): Promise<AvailabilityDayView[]> {
    return this.availabilityService.bulkUpsert(propertyId, user.userId, dto.entries);
  }
}
