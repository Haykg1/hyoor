import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

import { HostProfilesController } from './host-profiles.controller';
import { HostProfilesService } from './host-profiles.service';

@Module({
  imports: [forwardRef(() => AuthModule), StorageModule],
  controllers: [HostProfilesController],
  providers: [HostProfilesService],
  exports: [HostProfilesService],
})
export class HostProfilesModule {}
