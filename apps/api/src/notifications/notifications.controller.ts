import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Notification } from '@repo/database/client';
import type { PaginatedResponse } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  @ApiOkResponse({ description: 'Paginated notifications, optionally filtered to unread only' })
  @ApiStandardErrors()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query() dto: QueryNotificationsDto,
  ): Promise<PaginatedResponse<Notification>> {
    return this.notificationsService.findByUser(user.userId, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiOkResponse({ description: 'Count of unread notifications' })
  @ApiStandardErrors()
  getUnreadCount(@CurrentUser() user: RequestUser): Promise<{ count: number }> {
    return this.notificationsService.getUnreadCount(user.userId).then((count) => ({ count }));
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ description: 'Number of notifications marked as read' })
  @ApiStandardErrors()
  markAllRead(@CurrentUser() user: RequestUser): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiOkResponse({ description: 'Updated notification' })
  @ApiStandardErrors({ notFound: true })
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<Notification> {
    return this.notificationsService.markRead(id, user.userId);
  }
}
