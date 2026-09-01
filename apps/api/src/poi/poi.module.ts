import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

import { AdminPoiController } from './admin-poi.controller';
import { AdminPoiService } from './admin-poi.service';
import { PoiImageSearchService } from './poi-image-search.service';
import { PoiSeedService } from './poi-seed.service';
import { PoiController } from './poi.controller';
import { PoiService } from './poi.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [PoiController, AdminPoiController],
  providers: [PoiService, PoiSeedService, AdminPoiService, PoiImageSearchService],
  exports: [PoiService, PoiSeedService],
})
export class PoiModule {}
