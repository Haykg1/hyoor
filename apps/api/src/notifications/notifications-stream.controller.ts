import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { SseJwtGuard } from './guards/sse-jwt.guard';
import { NotificationRealtimeService } from './notification-realtime.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsStreamController {
  constructor(private readonly notificationRealtime: NotificationRealtimeService) {}

  @Sse('stream')
  @SkipTransform()
  @UseGuards(SseJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'SSE stream of real-time notifications (pass access_token query param for EventSource)',
  })
  @ApiStandardErrors({ auth: true })
  stream(@CurrentUser() user: RequestUser): Observable<MessageEvent> {
    return this.notificationRealtime.streamForUser(user.userId);
  }
}
