import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import Stripe from 'stripe';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';

import { STRIPE_CLIENT } from './stripe-client.provider';
import { StripeConnectService } from './stripe-connect.service';

@ApiExcludeController()
@Controller('bookings/webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly stripeConnect: StripeConnectService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const webhookSecret = this.config.get('stripe.webhookSecret', { infer: true });
    if (!signature || !webhookSecret || !req.rawBody) {
      throw new BadRequestException('Missing Stripe signature');
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(error)}`);
      throw new BadRequestException('Invalid signature');
    }

    switch (event.type) {
      case 'account.updated':
        await this.stripeConnect.syncAccountStatus(event.data.object as Stripe.Account);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }
    return { received: true };
  }

  private async handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [{ stripePaymentIntentId: intent.id }, { stripeDepositPaymentIntentId: intent.id }],
      },
    });
    if (!booking || booking.status !== 'AWAITING_PAYMENT') {
      return;
    }
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'FAILED' },
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;
    const booking = await this.prisma.booking.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!booking) return;
    const status = charge.amount_refunded >= charge.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: status, refundedAmount: charge.amount_refunded },
    });
  }
}
