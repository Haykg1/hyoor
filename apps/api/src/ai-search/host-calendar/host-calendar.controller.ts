import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type {
  AiSearchQuota,
  HostCalendarChatResponse,
  HostCalendarSuggestionsResponse,
} from '@repo/shared';

import { CurrentUser, type RequestUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiStandardErrors } from '../../common/swagger/api-responses.decorator';
import { AI_SEARCH_THROTTLE } from '../../common/throttle/throttle.constants';
import { AiSearchQuotaService } from '../ai-search-quota.service';

import { HostCalendarChatDto, HostCalendarConfirmDto } from './dto/host-calendar.dto';
import { HostCalendarService } from './host-calendar.service';

@ApiTags('ai-search')
@Controller('ai-search/host-calendar')
@Throttle(AI_SEARCH_THROTTLE)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HOST')
@ApiBearerAuth()
export class HostCalendarController {
  constructor(
    private readonly hostCalendarService: HostCalendarService,
    private readonly quotaService: AiSearchQuotaService,
  ) {}

  @Get('quota')
  @ApiOperation({ summary: 'Get host calendar AI quota for the authenticated host' })
  @ApiOkResponse({ description: 'Remaining host calendar AI requests' })
  @ApiStandardErrors({ auth: true, throttle: true })
  getQuota(@CurrentUser() user: RequestUser): Promise<AiSearchQuota> {
    return this.quotaService.getHostCalendarQuota(user.userId);
  }

  @Get(':propertyId/suggestions')
  @ApiOperation({ summary: 'Get AI-generated calendar chat suggestions for a property' })
  @ApiOkResponse({ description: 'Short actionable calendar chat prompts' })
  @ApiStandardErrors({ auth: true, throttle: true })
  getSuggestions(
    @Param('propertyId') propertyId: string,
    @Query('locale') locale: string | undefined,
    @CurrentUser() user: RequestUser,
  ): Promise<HostCalendarSuggestionsResponse> {
    return this.hostCalendarService.getSuggestions(propertyId, user, locale ?? 'en');
  }

  @Post(':propertyId/chat')
  @ApiOperation({ summary: 'Chat with AI to propose calendar changes for a property' })
  @ApiOkResponse({ description: 'Clarification, preview, or already-applied response' })
  @ApiStandardErrors({ auth: true, throttle: true })
  chat(
    @Param('propertyId') propertyId: string,
    @Body() dto: HostCalendarChatDto,
    @CurrentUser() user: RequestUser,
  ): Promise<HostCalendarChatResponse> {
    return this.hostCalendarService.chat(propertyId, user, dto.messages, dto.locale ?? 'en');
  }

  @Post(':propertyId/confirm')
  @ApiOperation({ summary: 'Confirm and apply proposed calendar changes' })
  @ApiOkResponse({ description: 'Applied calendar changes with revert hint' })
  @ApiStandardErrors({ auth: true, throttle: true })
  confirm(
    @Param('propertyId') propertyId: string,
    @Body() dto: HostCalendarConfirmDto,
    @CurrentUser() user: RequestUser,
  ): Promise<HostCalendarChatResponse> {
    return this.hostCalendarService.confirm(propertyId, user, dto.entries, dto.locale ?? 'en');
  }
}
