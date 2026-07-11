import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentFailuresModule } from '../payment-failures/payment-failures.module';

import { PaymentsController } from './payments.controller';
import { PaymentsRegistry } from './payments.registry';
import { PaymentsService } from './payments.service';
import { ArcaProvider } from './providers/arca.provider';
import { CashProvider } from './providers/cash.provider';
import { IdramProvider } from './providers/idram.provider';
import { StripeCheckoutService } from './stripe/stripe-checkout.service';
import { StripeClientProvider } from './stripe/stripe-client.provider';
import { StripeConnectService } from './stripe/stripe-connect.service';
import { StripeWebhookController } from './stripe/stripe-webhook.controller';

@Module({
  imports: [NotificationsModule, PaymentFailuresModule],
  // StripeWebhookController must be registered before PaymentsController — its
  // literal `bookings/webhooks/stripe` route would otherwise be shadowed by
  // PaymentsController's catch-all `bookings/webhooks/:provider`.
  controllers: [StripeWebhookController, PaymentsController],
  providers: [
    IdramProvider,
    ArcaProvider,
    CashProvider,
    PaymentsRegistry,
    PaymentsService,
    StripeClientProvider,
    StripeConnectService,
    StripeCheckoutService,
  ],
  exports: [PaymentsService, StripeConnectService, StripeCheckoutService],
})
export class PaymentsModule {}
