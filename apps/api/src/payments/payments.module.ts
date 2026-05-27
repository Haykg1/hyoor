import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsRegistry } from './payments.registry';
import { PaymentsService } from './payments.service';
import { ArcaProvider } from './providers/arca.provider';
import { CashProvider } from './providers/cash.provider';
import { IdramProvider } from './providers/idram.provider';

@Module({
  controllers: [PaymentsController],
  providers: [IdramProvider, ArcaProvider, CashProvider, PaymentsRegistry, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
