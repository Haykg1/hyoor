import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { GuestInstructionsCronService } from './guest-instructions-cron.service';

const isTestEnv = process.env.NODE_ENV === 'test';

@Module({
  imports: isTestEnv ? [] : [ScheduleModule.forRoot()],
  providers: isTestEnv ? [] : [GuestInstructionsCronService],
})
export class SchedulingModule {}
