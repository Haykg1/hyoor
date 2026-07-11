import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DepositClaimsModule } from '../deposit-claims/deposit-claims.module';
import { PaymentFailuresModule } from '../payment-failures/payment-failures.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { StorageModule } from '../storage/storage.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    DepositClaimsModule,
    StorageModule,
    SchedulingModule,
    PaymentFailuresModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
