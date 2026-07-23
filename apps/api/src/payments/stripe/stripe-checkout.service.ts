import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Booking } from '@repo/database/client';
import { Prisma } from '@repo/database/client';
import { computeCancellationFee } from '@repo/shared';
import Stripe from 'stripe';

import { isPrismaSerializationFailure, runWithRetry } from '../../common/connection/retry';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PaymentFailuresService } from '../../payment-failures/payment-failures.service';

import { STRIPE_CLIENT } from './stripe-client.provider';

export const INSUFFICIENT_BALANCE_MESSAGE =
  'Insufficient card balance to authorize the stay and security deposit.';

export interface SetupIntentResult {
  clientSecret: string;
}

export interface ConfirmPaymentResult {
  status: 'CONFIRMED' | 'REQUIRES_ACTION';
  clientSecret?: string;
}

@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly notifications: NotificationsService,
    private readonly paymentFailures: PaymentFailuresService,
  ) {}

  async createSetupIntent(bookingId: string, guestUserId: string): Promise<SetupIntentResult> {
    const booking = await this.getPayableBookingOrThrow(bookingId, guestUserId);
    const customerId = await this.ensureStripeCustomer(booking.guestId);
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: { bookingId: booking.id },
    });
    if (!setupIntent.client_secret) {
      throw new BadRequestException('Failed to initialize card setup');
    }
    return { clientSecret: setupIntent.client_secret };
  }

  /**
   * Authorizes rent (+ deposit when present) all-or-nothing. If either hold fails,
   * both PaymentIntents are canceled and the booking stays AWAITING_PAYMENT with
   * paymentStatus FAILED so the guest can retry. Idempotent for 3DS continuation
   * when the same payment method is reused.
   */
  async confirmBookingPayment(
    bookingId: string,
    guestUserId: string,
    paymentMethodId: string,
  ): Promise<ConfirmPaymentResult> {
    const booking = await this.getPayableBookingOrThrow(bookingId, guestUserId);
    const customerId = await this.ensureStripeCustomer(booking.guestId);
    const rentAmount = booking.totalAmount - booking.securityDeposit;
    const currency = booking.currency.toLowerCase();
    let rentIntentId: string | null = booking.stripePaymentIntentId;
    let depositIntentId: string | null = booking.stripeDepositPaymentIntentId;
    let rentAuthorized = false;
    let rentIntent: Stripe.PaymentIntent;
    let authorizedDepositIntentId: string | null = null;
    try {
      rentIntent = await this.confirmOrRetrieveIntent(
        rentIntentId,
        rentAmount,
        currency,
        customerId,
        paymentMethodId,
        { bookingId: booking.id, kind: 'rent' },
      );
      rentIntentId = rentIntent.id;
      if (rentIntent.id !== booking.stripePaymentIntentId) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { stripePaymentIntentId: rentIntent.id },
        });
      }
      if (rentIntent.status === 'requires_action') {
        return { status: 'REQUIRES_ACTION', clientSecret: rentIntent.client_secret ?? undefined };
      }
      if (rentIntent.status !== 'requires_capture') {
        throw new BadRequestException(`Payment could not be authorized (${rentIntent.status})`);
      }
      rentAuthorized = true;
      if (booking.securityDeposit > 0) {
        const depositIntent = await this.confirmOrRetrieveIntent(
          depositIntentId,
          booking.securityDeposit,
          currency,
          customerId,
          paymentMethodId,
          { bookingId: booking.id, kind: 'deposit' },
        );
        depositIntentId = depositIntent.id;
        if (depositIntent.status === 'requires_action') {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              stripePaymentIntentId: rentIntent.id,
              stripeDepositPaymentIntentId: depositIntent.id,
            },
          });
          return {
            status: 'REQUIRES_ACTION',
            clientSecret: depositIntent.client_secret ?? undefined,
          };
        }
        if (depositIntent.status !== 'requires_capture') {
          throw new BadRequestException(INSUFFICIENT_BALANCE_MESSAGE);
        }
        authorizedDepositIntentId = depositIntent.id;
      }
    } catch (error) {
      await this.rollbackPaymentAuths(booking.id, rentIntentId, depositIntentId);
      throw this.toAuthFailureException(error, rentAuthorized);
    }
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'AUTHORIZED',
        paymentInitiatedAt: booking.paymentInitiatedAt ?? new Date(),
        stripePaymentIntentId: rentIntent.id,
        stripeDepositPaymentIntentId: authorizedDepositIntentId,
        depositStatus: authorizedDepositIntentId ? 'AUTHORIZED' : 'NONE',
      },
    });
    await this.notifications.notify(booking.guestId, 'BOOKING_CONFIRMED', booking.id, 'booking');
    return { status: 'CONFIRMED' };
  }

  async captureRentOnCheckIn(booking: Booking): Promise<void> {
    if (!booking.stripePaymentIntentId) {
      this.logger.warn(`Booking ${booking.id} has no rent PaymentIntent to capture`);
      return;
    }
    try {
      const intent = await this.stripe.paymentIntents.capture(booking.stripePaymentIntentId);
      const amountCaptured = intent.amount_received;
      const { platformFeeAmount, hostPayoutAmount } = await this.computePayoutSplit(
        booking.propertyId,
        amountCaptured,
      );
      const payoutDelayHours = this.config.get('stripe.payoutDelayHours', { infer: true });
      await runWithRetry(
        () =>
          this.prisma.$transaction(
            async (tx) => {
              const result = await tx.booking.updateMany({
                where: {
                  id: booking.id,
                  paymentStatus: 'AUTHORIZED',
                },
                data: {
                  paymentStatus: 'CAPTURED',
                  capturedAt: new Date(),
                  paymentCompletedAt: new Date(),
                  platformFeeAmount,
                  hostPayoutAmount,
                  payoutStatus: 'SCHEDULED',
                  payoutScheduledAt: new Date(Date.now() + payoutDelayHours * 60 * 60 * 1000),
                },
              });
              if (result.count === 0) {
                this.logger.warn(
                  `Booking ${booking.id} rent capture skipped — already captured or not AUTHORIZED`,
                );
              }
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          ),
        async () => undefined,
        undefined,
        isPrismaSerializationFailure,
      );
    } catch (error) {
      await this.paymentFailures.record(booking.id, 'RENT_CAPTURE_FAILED', error);
      throw error;
    }
  }

  async payoutToHost(booking: Booking): Promise<void> {
    if (!booking.hostPayoutAmount || booking.hostPayoutAmount <= 0) {
      this.logger.warn(`Booking ${booking.id} has no payout amount to transfer`);
      await this.prisma.booking.updateMany({
        where: {
          id: booking.id,
          payoutStatus: { in: ['SCHEDULED', 'FAILED'] },
        },
        data: { payoutStatus: 'PAID' },
      });
      return;
    }
    const property = await this.prisma.property.findUniqueOrThrow({
      where: { id: booking.propertyId },
      include: { host: true },
    });
    if (!property.host.stripeAccountId) {
      const message = 'Host has no connected Stripe account, cannot pay out';
      this.logger.error(`Booking ${booking.id}: ${message}`);
      await this.paymentFailures.record(booking.id, 'PAYOUT_TRANSFER_FAILED', new Error(message));
      await this.prisma.booking.updateMany({
        where: {
          id: booking.id,
          payoutStatus: { in: ['SCHEDULED', 'FAILED'] },
        },
        data: { payoutStatus: 'FAILED', payoutScheduledAt: this.nextPayoutRetryAt() },
      });
      return;
    }
    try {
      const transfer = await this.stripe.transfers.create(
        {
          amount: booking.hostPayoutAmount,
          currency: booking.currency.toLowerCase(),
          destination: property.host.stripeAccountId,
          transfer_group: booking.id,
          metadata: { bookingId: booking.id },
        },
        { idempotencyKey: `payout-${booking.id}-${booking.hostPayoutAmount}` },
      );
      await runWithRetry(
        () =>
          this.prisma.$transaction(
            async (tx) => {
              const result = await tx.booking.updateMany({
                where: {
                  id: booking.id,
                  payoutStatus: { in: ['SCHEDULED', 'FAILED'] },
                  stripeTransferId: null,
                },
                data: { payoutStatus: 'PAID', stripeTransferId: transfer.id },
              });
              if (result.count === 0) {
                this.logger.warn(
                  `Booking ${booking.id} payout skipped — already paid or ineligible`,
                );
              }
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          ),
        async () => undefined,
        undefined,
        isPrismaSerializationFailure,
      );
    } catch (error) {
      this.logger.error(`Transfer failed for booking ${booking.id}: ${String(error)}`);
      await this.paymentFailures.record(booking.id, 'PAYOUT_TRANSFER_FAILED', error);
      await this.prisma.booking.updateMany({
        where: {
          id: booking.id,
          payoutStatus: { in: ['SCHEDULED', 'FAILED'] },
        },
        data: { payoutStatus: 'FAILED', payoutScheduledAt: this.nextPayoutRetryAt() },
      });
    }
  }

  private nextPayoutRetryAt(): Date {
    const retryMinutes = this.config.get('stripe.payoutRetryMinutes', { infer: true });
    return new Date(Date.now() + retryMinutes * 60 * 1000);
  }

  /** Cancels the Stripe hold only — callers own the local `depositStatus` write, so it
   * can be committed atomically alongside any other related write (e.g. a claim status). */
  async releaseDeposit(booking: Booking): Promise<void> {
    if (!booking.stripeDepositPaymentIntentId || booking.depositStatus !== 'AUTHORIZED') {
      return;
    }
    try {
      await this.safeCancelIntent(booking.stripeDepositPaymentIntentId);
    } catch (error) {
      await this.paymentFailures.record(booking.id, 'DEPOSIT_RELEASE_FAILED', error);
      throw error;
    }
  }

  /** Captures the approved claim amount and transfers it to the host immediately (no
   * platform fee). Stripe side effects only — callers own the local `depositStatus` write. */
  async captureDepositForClaim(
    booking: Booking,
    amount: number,
  ): Promise<{ stripeTransferId: string | null }> {
    if (!booking.stripeDepositPaymentIntentId) {
      throw new BadRequestException('Booking has no deposit hold to capture');
    }
    await this.stripe.paymentIntents.capture(booking.stripeDepositPaymentIntentId, {
      amount_to_capture: amount,
    });
    const property = await this.prisma.property.findUniqueOrThrow({
      where: { id: booking.propertyId },
      include: { host: true },
    });
    if (!property.host.stripeAccountId) {
      const message = 'Host has no connected Stripe account, cannot pay out claim';
      this.logger.error(`Booking ${booking.id}: ${message}`);
      await this.paymentFailures.record(
        booking.id,
        'DEPOSIT_CLAIM_TRANSFER_FAILED',
        new Error(message),
      );
      return { stripeTransferId: null };
    }
    try {
      const transfer = await this.stripe.transfers.create({
        amount,
        currency: booking.currency.toLowerCase(),
        destination: property.host.stripeAccountId,
        transfer_group: `${booking.id}-deposit-claim`,
        metadata: { bookingId: booking.id, kind: 'deposit-claim' },
      });
      return { stripeTransferId: transfer.id };
    } catch (error) {
      this.logger.error(
        `Deposit claim transfer failed for booking ${booking.id}: ${String(error)}`,
      );
      await this.paymentFailures.record(booking.id, 'DEPOSIT_CLAIM_TRANSFER_FAILED', error);
      return { stripeTransferId: null };
    }
  }

  /**
   * Cancellation refund rule: when `applyFee` is false the guest's rent hold is
   * fully released. When true, the property cancellation fee (percent or fixed)
   * is captured and the remainder auto-releases. Deposit is always released
   * (no damage claims possible pre-check-in).
   */
  async cancelBookingPayment(booking: Booking, applyFee: boolean): Promise<void> {
    const property = await this.prisma.property.findUniqueOrThrow({
      where: { id: booking.propertyId },
    });
    const rentAmount = booking.totalAmount - booking.securityDeposit;
    const nonRefundableAmount = applyFee
      ? computeCancellationFee(
          rentAmount,
          property.cancellationFeeType,
          property.cancellationFeeValue,
        )
      : 0;

    if (booking.stripeDepositPaymentIntentId) {
      await this.safeCancelIntent(booking.stripeDepositPaymentIntentId);
    }

    if (!booking.stripePaymentIntentId) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'CANCELLED', depositStatus: 'RELEASED' },
      });
      return;
    }

    if (nonRefundableAmount <= 0) {
      await this.safeCancelIntent(booking.stripePaymentIntentId);
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'CANCELLED',
          depositStatus: 'RELEASED',
          refundedAmount: rentAmount,
        },
      });
      return;
    }

    try {
      const intent = await this.stripe.paymentIntents.capture(booking.stripePaymentIntentId, {
        amount_to_capture: nonRefundableAmount,
      });
      const amountCaptured = intent.amount_received;
      const { platformFeeAmount, hostPayoutAmount } = await this.computePayoutSplit(
        booking.propertyId,
        amountCaptured,
      );
      const payoutDelayHours = this.config.get('stripe.payoutDelayHours', { infer: true });
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'PARTIALLY_REFUNDED',
          capturedAt: new Date(),
          paymentCompletedAt: new Date(),
          depositStatus: 'RELEASED',
          refundedAmount: rentAmount - amountCaptured,
          platformFeeAmount,
          hostPayoutAmount,
          payoutStatus: 'SCHEDULED',
          payoutScheduledAt: new Date(Date.now() + payoutDelayHours * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      await this.paymentFailures.record(booking.id, 'CANCELLATION_CAPTURE_FAILED', error);
      throw error;
    }
  }

  /** Abandoned AWAITING_PAYMENT booking past its lock window — nothing to capture, just clean up. */
  async expirePaymentLock(booking: Booking): Promise<void> {
    if (booking.stripePaymentIntentId) {
      await this.safeCancelIntent(booking.stripePaymentIntentId);
    }
    if (booking.stripeDepositPaymentIntentId) {
      await this.safeCancelIntent(booking.stripeDepositPaymentIntentId);
    }
  }

  private async computePayoutSplit(
    propertyId: string,
    capturedAmount: number,
  ): Promise<{ platformFeeAmount: number; hostPayoutAmount: number }> {
    const property = await this.prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: { host: true },
    });
    const feePercent = property.host.platformFeePercent
      ? Number(property.host.platformFeePercent)
      : this.config.get('stripe.platformFeePercentDefault', { infer: true });
    const platformFeeAmount = Math.round((capturedAmount * feePercent) / 100);
    return { platformFeeAmount, hostPayoutAmount: capturedAmount - platformFeeAmount };
  }

  private async confirmOrRetrieveIntent(
    existingIntentId: string | null,
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId: string,
    metadata: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    if (existingIntentId) {
      const existing = await this.stripe.paymentIntents.retrieve(existingIntentId);
      const samePaymentMethod = this.paymentMethodIdOf(existing) === paymentMethodId;
      const reusableStatus =
        existing.status === 'requires_capture' || existing.status === 'requires_action';
      if (reusableStatus && samePaymentMethod) {
        return existing;
      }
      if (
        reusableStatus ||
        existing.status === 'requires_confirmation' ||
        existing.status === 'requires_payment_method'
      ) {
        await this.safeCancelIntent(existingIntentId);
      }
    }
    try {
      return await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        payment_method_types: ['card'],
        capture_method: 'manual',
        confirm: true,
        metadata,
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'insufficient_funds') {
          throw new BadRequestException(INSUFFICIENT_BALANCE_MESSAGE);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private paymentMethodIdOf(intent: Stripe.PaymentIntent): string | null {
    const paymentMethod = intent.payment_method;
    if (typeof paymentMethod === 'string') return paymentMethod;
    return paymentMethod?.id ?? null;
  }

  /**
   * Compensates a partial auth: cancel both Stripe holds and mark the booking payment
   * failed while leaving status AWAITING_PAYMENT for retry within the lock window.
   */
  private async rollbackPaymentAuths(
    bookingId: string,
    rentIntentId: string | null,
    depositIntentId: string | null,
  ): Promise<void> {
    for (const intentId of [rentIntentId, depositIntentId]) {
      if (!intentId) continue;
      try {
        await this.cancelIntentOrThrow(intentId);
      } catch (error) {
        this.logger.error(
          `Failed to cancel PaymentIntent ${intentId} during auth rollback for booking ${bookingId}: ${String(error)}`,
        );
      }
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        stripePaymentIntentId: null,
        stripeDepositPaymentIntentId: null,
        paymentStatus: 'FAILED',
        depositStatus: 'NONE',
      },
    });
  }

  private toAuthFailureException(error: unknown, afterPartialAuth: boolean): BadRequestException {
    if (error instanceof BadRequestException) {
      if (afterPartialAuth && error.message !== INSUFFICIENT_BALANCE_MESSAGE) {
        return new BadRequestException(INSUFFICIENT_BALANCE_MESSAGE);
      }
      return error;
    }
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'insufficient_funds' || afterPartialAuth) {
        return new BadRequestException(INSUFFICIENT_BALANCE_MESSAGE);
      }
      return new BadRequestException(error.message);
    }
    if (afterPartialAuth) {
      return new BadRequestException(INSUFFICIENT_BALANCE_MESSAGE);
    }
    const message = error instanceof Error ? error.message : 'Payment could not be authorized';
    return new BadRequestException(message);
  }

  private async cancelIntentOrThrow(intentId: string): Promise<void> {
    const intent = await this.stripe.paymentIntents.retrieve(intentId);
    if (
      intent.status === 'requires_capture' ||
      intent.status === 'requires_confirmation' ||
      intent.status === 'requires_payment_method' ||
      intent.status === 'requires_action'
    ) {
      await this.stripe.paymentIntents.cancel(intentId);
    }
  }

  private async safeCancelIntent(intentId: string): Promise<void> {
    try {
      await this.cancelIntentOrThrow(intentId);
    } catch (error) {
      this.logger.warn(`Failed to cancel PaymentIntent ${intentId}: ${String(error)}`);
    }
  }

  private async ensureStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }
    const customer = await this.stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  private async getPayableBookingOrThrow(bookingId: string, guestUserId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }
    if (booking.guestId !== guestUserId) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }
    if (booking.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException('This booking is not awaiting payment');
    }
    if (booking.paymentLockExpiresAt && booking.paymentLockExpiresAt < new Date()) {
      throw new BadRequestException('The payment window for this booking has expired');
    }
    return booking;
  }
}
