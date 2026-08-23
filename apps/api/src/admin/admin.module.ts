import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PaymentFailuresModule } from '../payment-failures/payment-failures.module';
import { PoiModule } from '../poi/poi.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { StorageModule } from '../storage/storage.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    StorageModule,
    SchedulingModule,
    PaymentFailuresModule,
    PoiModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
