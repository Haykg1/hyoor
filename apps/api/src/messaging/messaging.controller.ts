import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type {
  ConversationDetail,
  ConversationPreview,
  CursorPage,
  MessageView,
} from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { MESSAGING_THROTTLE } from '../common/throttle/throttle.constants';

import { CreateConversationDto } from './dto/create-conversation.dto';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagingService } from './messaging.service';

@ApiTags('messaging')
@Controller('messaging/conversations')
@Throttle(MESSAGING_THROTTLE)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('GUEST')
  @ApiOperation({ summary: 'Find or create a conversation with a property host' })
  @ApiCreatedResponse({ description: 'Conversation preview' })
  @ApiStandardErrors({ notFound: true })
  findOrCreate(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationPreview> {
    return this.messagingService.findOrCreateByProperty(
      user.userId,
      user.role as 'GUEST' | 'HOST' | 'ADMIN' | 'STAFF',
      dto.propertyId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List conversations for the authenticated user' })
  @ApiOkResponse({ description: 'Cursor-paginated conversation previews' })
  @ApiStandardErrors()
  getConversations(
    @CurrentUser() user: RequestUser,
    @Query() dto: CursorPaginationDto,
  ): Promise<CursorPage<ConversationPreview>> {
    return this.messagingService.getConversations(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation detail' })
  @ApiOkResponse({ description: 'Conversation detail without messages' })
  @ApiStandardErrors({ notFound: true })
  getConversation(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ConversationDetail> {
    return this.messagingService.getConversation(id, user.userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  @ApiOkResponse({ description: 'Cursor-paginated messages (newest first)' })
  @ApiStandardErrors({ notFound: true })
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Query() dto: CursorPaginationDto,
  ): Promise<CursorPage<MessageView>> {
    return this.messagingService.getMessages(id, user.userId, dto);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiCreatedResponse({ description: 'Message sent' })
  @ApiStandardErrors({ notFound: true })
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: SendMessageDto,
  ): Promise<MessageView> {
    return this.messagingService.sendMessage(id, user.userId, dto.body);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiOkResponse({ description: 'Number of messages marked as read' })
  @ApiStandardErrors({ notFound: true })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ updatedCount: number }> {
    return this.messagingService.markAsRead(id, user.userId);
  }
}
