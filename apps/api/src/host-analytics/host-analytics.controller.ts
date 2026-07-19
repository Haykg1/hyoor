import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HostAnalyticsResponse } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { QueryHostAnalyticsDto } from './dto/query-host-analytics.dto';
import { HostAnalyticsService } from './host-analytics.service';

@ApiTags('host-analytics')
@Controller('host-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HOST')
@ApiBearerAuth()
export class HostAnalyticsController {
  constructor(private readonly hostAnalyticsService: HostAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Host performance analytics for the selected date range' })
  @ApiOkResponse({ description: 'Analytics KPIs, charts series, and guest origins' })
  @ApiStandardErrors()
  getAnalytics(
    @CurrentUser() user: RequestUser,
    @Query() dto: QueryHostAnalyticsDto,
  ): Promise<HostAnalyticsResponse> {
    return this.hostAnalyticsService.getAnalytics(user.userId, dto);
  }
}
