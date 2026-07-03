import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AvailabilityModule } from '../availability/availability.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { HostProfilesModule } from '../host-profiles/host-profiles.module';
import { PropertiesModule } from '../properties/properties.module';

import { AiSearchQuotaService } from './ai-search-quota.service';
import { AiSearchController } from './ai-search.controller';
import { AiSearchService } from './ai-search.service';
import { HostCalendarController } from './host-calendar/host-calendar.controller';
import { HostCalendarService } from './host-calendar/host-calendar.service';
import { LlmService } from './llm/llm.service';
import { OpenAiLlmService } from './llm/openai-llm.service';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => PropertiesModule),
    GeocodingModule,
    AvailabilityModule,
    HostProfilesModule,
  ],
  controllers: [AiSearchController, HostCalendarController],
  providers: [
    AiSearchService,
    AiSearchQuotaService,
    HostCalendarService,
    { provide: LlmService, useClass: OpenAiLlmService },
    OpenAiLlmService,
  ],
  exports: [AiSearchService, HostCalendarService, LlmService, AiSearchQuotaService],
})
export class AiSearchModule {}
