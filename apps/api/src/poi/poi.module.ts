import { Module } from '@nestjs/common';

import { PoiSeedService } from './poi-seed.service';
import { PoiController } from './poi.controller';
import { PoiService } from './poi.service';

@Module({
  controllers: [PoiController],
  providers: [PoiService, PoiSeedService],
  exports: [PoiService],
})
export class PoiModule {}
