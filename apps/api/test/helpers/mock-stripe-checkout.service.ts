import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Booking } from '@repo/database/client';

import { PrismaService } from '../../src/database/prisma.service';
import type {
  ConfirmPaymentResult,
  SetupIntentResult,
} from '../../src/payments/stripe/stripe-checkout.service';

/**
 * Stands in for the real Stripe-backed checkout flow in e2e tests. Mirrors the DB
 * side effects of StripeCheckoutService's public methods without calling Stripe,
 * so specs exercise the same controller/service code paths end to end.
 */
@Injectable()
export class MockStripeCheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async createSetupIntent(bookingId: string, guestUserId: string): Promise<SetupIntentResult> {
    await this.getPayableBookingOrThrow(bookingId, guestUserId);
    return { clientSecret: `seti_mock_${bookingId}_secret` };
  }

  async confirmBookingPayment(
    bookingId: string,
    guestUserId: string,
    _paymentMethodId: string,
  ): Promise<ConfirmPaymentResult> {
    const booking = await this.getPayableBookingOrThrow(bookingId, guestUserId);
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'AUTHORIZED',
        paymentInitiatedAt: booking.paymentInitiatedAt ?? new Date(),
        stripePaymentIntentId: `pi_mock_${bookingId}`,
        stripeDepositPaymentIntentId:
          booking.securityDeposit > 0 ? `pi_mock_deposit_${bookingId}` : null,
        depositStatus: booking.securityDeposit > 0 ? 'AUTHORIZED' : 'NONE',
      },
    });
    return { status: 'CONFIRMED' };
  }

  async captureRentOnCheckIn(booking: Booking): Promise<void> {
    const rentAmount = booking.totalAmount - booking.securityDeposit;
    const platformFeeAmount = Math.round(rentAmount * 0.1);
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'CAPTURED',
        capturedAt: new Date(),
        paymentCompletedAt: new Date(),
        platformFeeAmount,
        hostPayoutAmount: rentAmount - platformFeeAmount,
        payoutStatus: 'SCHEDULED',
        payoutScheduledAt: new Date(),
      },
    });
  }

  async payoutToHost(booking: Booking): Promise<void> {
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { payoutStatus: 'PAID', stripeTransferId: `tr_mock_${booking.id}` },
    });
  }

  async releaseDeposit(booking: Booking): Promise<void> {
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { depositStatus: 'RELEASED' },
    });
  }

  async captureDepositForClaim(
    booking: Booking,
    _amount: number,
  ): Promise<{ stripeTransferId: string | null }> {
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { depositStatus: 'CAPTURED' },
    });
    return { stripeTransferId: `tr_mock_claim_${booking.id}` };
  }

  async cancelBookingPayment(booking: Booking, cancelledByHost: boolean): Promise<void> {
    const rentAmount = booking.totalAmount - booking.securityDeposit;
    if (!booking.stripePaymentIntentId) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'CANCELLED', depositStatus: 'RELEASED' },
      });
      return;
    }
    const property = await this.prisma.property.findUniqueOrThrow({
      where: { id: booking.propertyId },
    });
    const nonRefundablePercent = cancelledByHost ? 0 : property.nonRefundablePercent;
    const nonRefundableAmount = Math.round((rentAmount * nonRefundablePercent) / 100);
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: nonRefundableAmount > 0 ? 'PARTIALLY_REFUNDED' : 'CANCELLED',
        depositStatus: 'RELEASED',
        refundedAmount: rentAmount - nonRefundableAmount,
      },
    });
  }

  async expirePaymentLock(_booking: Booking): Promise<void> {}

  private async getPayableBookingOrThrow(bookingId: string, guestUserId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.guestId !== guestUserId) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }
    if (booking.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException('This booking is not awaiting payment');
    }
    return booking;
  }
}
