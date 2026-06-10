import { Module } from '@nestjs/common';

import { CompareShareController } from './compare-share.controller';
import { CompareShareService } from './compare-share.service';

@Module({
  controllers: [CompareShareController],
  providers: [CompareShareService],
})
export class CompareShareModule {}
