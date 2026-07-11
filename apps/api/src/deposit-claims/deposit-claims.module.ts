import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';

import { DepositClaimsService } from './deposit-claims.service';

@Module({
  imports: [PaymentsModule],
  providers: [DepositClaimsService],
  exports: [DepositClaimsService],
})
export class DepositClaimsModule {}
