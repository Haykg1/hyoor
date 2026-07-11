import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AvailabilityModule } from '../availability/availability.module';
import { CurrencyModule } from '../currency/currency.module';
import { PaymentFailuresModule } from '../payment-failures/payment-failures.module';
import { PaymentsModule } from '../payments/payments.module';
import { PromotionsModule } from '../promotions/promotions.module';

import { CheckinCaptureCronService } from './checkin-capture-cron.service';
import { CurrencyRatesCronService } from './currency-rates-cron.service';
import { DepositReleaseCronService } from './deposit-release-cron.service';
import { GuestInstructionsCronService } from './guest-instructions-cron.service';
import { HostPayoutCronService } from './host-payout-cron.service';
import { PaymentLockSweeperService } from './payment-lock-sweeper.service';

const isTestEnv = process.env.NODE_ENV === 'test';

const cronServices = [
  GuestInstructionsCronService,
  PaymentLockSweeperService,
  CheckinCaptureCronService,
  HostPayoutCronService,
  DepositReleaseCronService,
  CurrencyRatesCronService,
];

@Module({
  imports: isTestEnv
    ? [AvailabilityModule, PaymentsModule, PromotionsModule, PaymentFailuresModule, CurrencyModule]
    : [
        ScheduleModule.forRoot(),
        AvailabilityModule,
        PaymentsModule,
        PromotionsModule,
        PaymentFailuresModule,
        CurrencyModule,
      ],
  providers: cronServices,
  exports: cronServices,
})
export class SchedulingModule {}
