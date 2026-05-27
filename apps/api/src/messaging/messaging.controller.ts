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

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { GetMessagesDto } from './dto/get-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
  MessagingService,
  type ConversationDetail,
  type ConversationPreview,
  type MessageView,
} from './messaging.service';

@ApiTags('messaging')
@Controller('messaging/conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  @ApiOperation({ summary: 'List conversations for the authenticated user' })
  @ApiOkResponse({ description: 'Conversation previews with last message and unread count' })
  @ApiStandardErrors()
  getConversations(@CurrentUser() user: RequestUser): Promise<ConversationPreview[]> {
    return this.messagingService.getConversations(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation with paginated messages' })
  @ApiOkResponse({ description: 'Conversation detail with message history' })
  @ApiStandardErrors({ notFound: true })
  getConversation(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Query() dto: GetMessagesDto,
  ): Promise<ConversationDetail> {
    return this.messagingService.getConversation(id, user.userId, dto);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiCreatedResponse({ description: 'Message sent; recipient notified' })
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
