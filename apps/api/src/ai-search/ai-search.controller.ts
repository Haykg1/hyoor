import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AiSearchChatResponse, AiSearchQuota } from '@repo/shared';
import type { Request } from 'express';

import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { AI_SEARCH_THROTTLE } from '../common/throttle/throttle.constants';

import { AiSearchQuotaService } from './ai-search-quota.service';
import { AiSearchService } from './ai-search.service';
import { AiSearchChatDto } from './dto/ai-search-chat.dto';
import { getAiSearchOffTopicMessage } from './utils/chat-locale';
import { isAiSearchOnTopic } from './utils/input-guard';
import { getRequestClientIp } from './utils/request-ip';

@ApiTags('ai-search')
@Controller('ai-search')
@Throttle(AI_SEARCH_THROTTLE)
@UseGuards(OptionalJwtAuthGuard)
export class AiSearchController {
  constructor(
    private readonly aiSearchService: AiSearchService,
    private readonly aiSearchQuotaService: AiSearchQuotaService,
  ) {}

  @Get('quota')
  @ApiOperation({ summary: 'Get AI search quota for the current client' })
  @ApiOkResponse({ description: 'Remaining guest requests or authenticated status' })
  @ApiStandardErrors({ auth: false, throttle: true })
  getQuota(@Req() req: Request, @CurrentUser() user: RequestUser | null): Promise<AiSearchQuota> {
    return this.aiSearchQuotaService.getQuota(getRequestClientIp(req), user?.userId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI to find properties' })
  @ApiOkResponse({ description: 'Clarification question or property search results' })
  @ApiStandardErrors({ auth: false, throttle: true })
  async chat(
    @Body() dto: AiSearchChatDto,
    @Req() req: Request,
    @CurrentUser() user: RequestUser | null,
  ): Promise<AiSearchChatResponse> {
    const clientIp = getRequestClientIp(req);
    const userId = user?.userId;
    if (!isAiSearchOnTopic(dto.messages)) {
      const quota = await this.aiSearchQuotaService.getQuota(clientIp, userId);
      return { type: 'clarify', message: getAiSearchOffTopicMessage(dto.locale), quota };
    }
    await this.aiSearchQuotaService.assertTokenBudget(clientIp, userId);
    await this.aiSearchQuotaService.consumeRequest(clientIp, userId);
    const { response, tokensUsed } = await this.aiSearchService.chat(
      dto.messages,
      dto.locale ?? 'en',
    );
    const quota = await this.aiSearchQuotaService.recordTokenUsage(clientIp, userId, tokensUsed);
    return { ...response, quota };
  }
}
