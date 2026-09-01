import { Module } from '@nestjs/common';

import { AiSearchModule } from '../ai-search/ai-search.module';
import { AuthModule } from '../auth/auth.module';
import { CurrencyModule } from '../currency/currency.module';
import { SseJwtGuard } from '../notifications/guards/sse-jwt.guard';
import { PoiModule } from '../poi/poi.module';
import { StorageModule } from '../storage/storage.module';

import { TripPlannerCandidatesService } from './trip-planner-candidates.service';
import { TripPlannerJobService } from './trip-planner-job.service';
import { TripPlannerQuotaService } from './trip-planner-quota.service';
import { TripPlannerStreamController } from './trip-planner-stream.controller';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';

@Module({
  imports: [AuthModule, AiSearchModule, CurrencyModule, StorageModule, PoiModule],
  controllers: [TripPlannerController, TripPlannerStreamController],
  providers: [
    TripPlannerService,
    TripPlannerQuotaService,
    TripPlannerJobService,
    TripPlannerCandidatesService,
    SseJwtGuard,
  ],
})
export class TripPlannerModule {}
