import { Module } from '@nestjs/common';

import { HostProfilesModule } from '../host-profiles/host-profiles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PublicPromotionsController } from './public-promotions.controller';

@Module({
  imports: [HostProfilesModule, NotificationsModule, StorageModule],
  controllers: [PromotionsController, PublicPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
