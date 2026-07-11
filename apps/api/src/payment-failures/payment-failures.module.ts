import { Module } from '@nestjs/common';

import { PaymentFailuresService } from './payment-failures.service';

@Module({
  providers: [PaymentFailuresService],
  exports: [PaymentFailuresService],
})
export class PaymentFailuresModule {}
