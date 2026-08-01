import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

import { CancellationClaimsService } from './cancellation-claims.service';

@Module({
  imports: [PaymentsModule, NotificationsModule],
  providers: [CancellationClaimsService],
  exports: [CancellationClaimsService],
})
export class CancellationClaimsModule {}
