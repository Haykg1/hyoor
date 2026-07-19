import { Module } from '@nestjs/common';

import { HostProfilesModule } from '../host-profiles/host-profiles.module';

import { HostAnalyticsController } from './host-analytics.controller';
import { HostAnalyticsService } from './host-analytics.service';

@Module({
  imports: [HostProfilesModule],
  controllers: [HostAnalyticsController],
  providers: [HostAnalyticsService],
})
export class HostAnalyticsModule {}
