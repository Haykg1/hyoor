import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type {
  TripPlanDetail,
  TripPlanGenerateResponse,
  TripPlanSummary,
  TripPlannerQuotaView,
} from '@repo/shared';

import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { AI_SEARCH_THROTTLE } from '../common/throttle/throttle.constants';

import { AttachTripPlanBookingDto } from './dto/attach-trip-plan-booking.dto';
import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import { GenerateTripPlanDto } from './dto/generate-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { TripPlannerQuotaService } from './trip-planner-quota.service';
import { TripPlannerService } from './trip-planner.service';

@ApiTags('trip-planner')
@Controller('trip-planner')
@Throttle(AI_SEARCH_THROTTLE)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TripPlannerController {
  constructor(
    private readonly tripPlannerService: TripPlannerService,
    private readonly quotaService: TripPlannerQuotaService,
  ) {}

  @Get('quota')
  @ApiOperation({ summary: 'Get trip planner quota for the authenticated user' })
  @ApiOkResponse({ description: 'Remaining trip plans for the Yerevan calendar day' })
  @ApiStandardErrors({ auth: true, throttle: true })
  getQuota(@CurrentUser() user: RequestUser): Promise<TripPlannerQuotaView> {
    return this.quotaService.getQuota(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List trip plans for the current user' })
  @ApiOkResponse({ description: 'Trip plan summaries' })
  @ApiStandardErrors({ auth: true })
  list(@CurrentUser() user: RequestUser): Promise<TripPlanSummary[]> {
    return this.tripPlannerService.list(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Answer complete: create the plan and start generating' })
  @ApiOkResponse({ description: 'New plan (generating) and remaining quota' })
  @ApiStandardErrors({ auth: true, throttle: true })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTripPlanDto,
  ): Promise<TripPlanGenerateResponse> {
    return this.tripPlannerService.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a trip plan' })
  @ApiOkResponse({ description: 'Trip plan with days and intake answers' })
  @ApiStandardErrors({ auth: true, notFound: true })
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<TripPlanDetail> {
    return this.tripPlannerService.getById(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update draft trip plan answers or guest count' })
  @ApiOkResponse({ description: 'Updated trip plan' })
  @ApiStandardErrors({ auth: true, notFound: true })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripPlanDto,
  ): Promise<TripPlanDetail> {
    return this.tripPlannerService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a trip plan' })
  @ApiStandardErrors({ auth: true, notFound: true })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.tripPlannerService.remove(user.userId, id);
  }

  @Post(':id/generate')
  @ApiOperation({ summary: 'Generate the itinerary for a completed intake' })
  @ApiOkResponse({ description: 'Generation started or existing ready plan' })
  @ApiStandardErrors({ auth: true, throttle: true, notFound: true })
  generate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: GenerateTripPlanDto,
  ): Promise<TripPlanGenerateResponse> {
    return this.tripPlannerService.generate(user.userId, id, dto);
  }

  @Post(':id/days/:date/regenerate')
  @ApiOperation({ summary: 'Regenerate one day of a ready plan (1/4 daily quota)' })
  @ApiOkResponse({ description: 'Updated plan and remaining quota' })
  @ApiStandardErrors({ auth: true, throttle: true, notFound: true })
  regenerateDay(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('date') date: string,
  ): Promise<TripPlanGenerateResponse> {
    return this.tripPlannerService.regenerateDay(user.userId, id, date);
  }

  @Post(':id/items/:itemId/swap')
  @ApiOperation({ summary: 'Swap one stop (1/4 daily quota)' })
  @ApiOkResponse({ description: 'Updated plan and remaining quota' })
  @ApiStandardErrors({ auth: true, throttle: true, notFound: true })
  swapItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ): Promise<TripPlanGenerateResponse> {
    return this.tripPlannerService.swapItem(user.userId, id, itemId);
  }

  @Post(':id/booking')
  @ApiOperation({ summary: 'Attach an upcoming stay to a trip plan' })
  @ApiOkResponse({ description: 'Updated trip plan' })
  @ApiStandardErrors({ auth: true, notFound: true })
  attachBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AttachTripPlanBookingDto,
  ): Promise<TripPlanDetail> {
    return this.tripPlannerService.attachBooking(user.userId, id, dto.bookingId);
  }
}
