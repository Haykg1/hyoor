import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { HostProfilesModule } from '../host-profiles/host-profiles.module';
import { StorageModule } from '../storage/storage.module';

import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [forwardRef(() => AuthModule), HostProfilesModule, StorageModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
