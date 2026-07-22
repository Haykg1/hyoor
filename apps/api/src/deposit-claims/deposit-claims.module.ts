import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { StorageModule } from '../storage/storage.module';

import { DepositClaimsService } from './deposit-claims.service';

@Module({
  imports: [PaymentsModule, StorageModule, NotificationsModule],
  providers: [DepositClaimsService],
  exports: [DepositClaimsService],
})
export class DepositClaimsModule {}
