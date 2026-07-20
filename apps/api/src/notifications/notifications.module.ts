import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

import { SseJwtGuard } from './guards/sse-jwt.guard';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationsStreamController } from './notifications-stream.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [forwardRef(() => AuthModule), StorageModule],
  controllers: [NotificationsController, NotificationsStreamController],
  providers: [NotificationsService, NotificationRealtimeService, SseJwtGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
