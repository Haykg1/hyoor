import { Module } from '@nestjs/common';

import { HostProfilesModule } from '../host-profiles/host-profiles.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [HostProfilesModule, NotificationsModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
