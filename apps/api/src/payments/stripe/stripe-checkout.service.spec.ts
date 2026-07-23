import type { ConfigService } from '@nestjs/config';
import type { Booking } from '@repo/database/client';
import Stripe from 'stripe';

import type { AppConfig } from '../../config/configuration';
import type { PrismaService } from '../../database/prisma.service';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { PaymentFailuresService } from '../../payment-failures/payment-failures.service';

import { INSUFFICIENT_BALANCE_MESSAGE, StripeCheckoutService } from './stripe-checkout.service';

function baseBooking(overrides?: Partial<Booking>): Booking {
  return {
    id: 'booking_1',
    propertyId: 'prop_1',
    guestId: 'guest_1',
    status: 'AWAITING_PAYMENT',
    checkIn: new Date('2026-08-01'),
    checkOut: new Date('2026-08-03'),
    guestCount: 2,
    specialRequests: null,
    currency: 'USD',
    nightlyRate: 10000,
    nightsCount: 2,
    nightlyBreakdown: null,
    cleaningFee: 0,
    securityDeposit: 500,
    discountAmount: 0,
    promotionId: null,
    totalAmount: 20500,
    paymentProvider: 'STRIPE',
    paymentStatus: 'UNPAID',
    paymentInitiatedAt: null,
    paymentCompletedAt: null,
    externalPaymentRef: null,
    paymentLockExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    stripePaymentIntentId: null,
    stripeDepositPaymentIntentId: null,
    depositStatus: 'NONE',
    capturedAt: null,
    platformFeeAmount: null,
    hostPayoutAmount: null,
    stripeTransferId: null,
    payoutStatus: 'NONE',
    payoutScheduledAt: null,
    refundedAmount: 0,
    cancellationReason: null,
    cancelledAt: null,
    guestInstructionsSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Booking;
}

function intent(partial: Partial<Stripe.PaymentIntent> & { id: string }): Stripe.PaymentIntent {
  return {
    object: 'payment_intent',
    amount: 20000,
    currency: 'usd',
    status: 'requires_capture',
    client_secret: `${partial.id}_secret`,
    payment_method: 'pm_test',
    ...partial,
  } as Stripe.PaymentIntent;
}

function stripeCardError(code: string, message: string): Stripe.errors.StripeError {
  return Stripe.errors.StripeCardError.generate({
    type: 'card_error',
    code,
    message,
    charge: undefined,
  });
}

describe('StripeCheckoutService.confirmBookingPayment', () => {
  let prisma: {
    booking: { findUnique: jest.Mock; update: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
  };
  let stripe: {
    paymentIntents: {
      create: jest.Mock;
      retrieve: jest.Mock;
      cancel: jest.Mock;
    };
  };
  let notifications: { notify: jest.Mock };
  let service: StripeCheckoutService;

  beforeEach(() => {
    prisma = {
      booking: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'guest_1',
          email: 'guest@example.com',
          stripeCustomerId: 'cus_1',
        }),
      },
    };
    stripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        cancel: jest.fn().mockResolvedValue({}),
      },
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: jest.fn().mockReturnValue(10),
    } as unknown as ConfigService<AppConfig, true>;
    const paymentFailures = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as PaymentFailuresService;
    service = new StripeCheckoutService(
      stripe as unknown as Stripe,
      prisma as unknown as PrismaService,
      config,
      notifications as unknown as NotificationsService,
      paymentFailures,
    );
  });

  it('rolls back rent when deposit declines and leaves booking failed for retry', async () => {
    const booking = baseBooking();
    prisma.booking.findUnique.mockResolvedValue(booking);
    stripe.paymentIntents.create
      .mockResolvedValueOnce(
        intent({
          id: 'pi_rent',
          amount: 20000,
          status: 'requires_capture',
          payment_method: 'pm_1',
        }),
      )
      .mockRejectedValueOnce(stripeCardError('card_declined', 'Your card was declined.'));
    stripe.paymentIntents.retrieve.mockResolvedValue(
      intent({ id: 'pi_rent', status: 'requires_capture', payment_method: 'pm_1' }),
    );
    await expect(
      service.confirmBookingPayment(booking.id, booking.guestId, 'pm_1'),
    ).rejects.toThrow(INSUFFICIENT_BALANCE_MESSAGE);
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_rent');
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: booking.id },
        data: expect.objectContaining({
          stripePaymentIntentId: null,
          stripeDepositPaymentIntentId: null,
          paymentStatus: 'FAILED',
          depositStatus: 'NONE',
        }),
      }),
    );
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('confirms when both rent and deposit authorize', async () => {
    const booking = baseBooking();
    prisma.booking.findUnique.mockResolvedValue(booking);
    stripe.paymentIntents.create
      .mockResolvedValueOnce(
        intent({
          id: 'pi_rent',
          amount: 20000,
          status: 'requires_capture',
          payment_method: 'pm_1',
        }),
      )
      .mockResolvedValueOnce(
        intent({
          id: 'pi_deposit',
          amount: 500,
          status: 'requires_capture',
          payment_method: 'pm_1',
        }),
      );
    const result = await service.confirmBookingPayment(booking.id, booking.guestId, 'pm_1');
    expect(result).toEqual({ status: 'CONFIRMED' });
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMED',
          paymentStatus: 'AUTHORIZED',
          stripePaymentIntentId: 'pi_rent',
          stripeDepositPaymentIntentId: 'pi_deposit',
          depositStatus: 'AUTHORIZED',
        }),
      }),
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      booking.guestId,
      'BOOKING_CONFIRMED',
      booking.id,
      'booking',
    );
  });

  it('cancels a stale intent when payment method differs and creates a new one', async () => {
    const booking = baseBooking({
      stripePaymentIntentId: 'pi_old_rent',
      securityDeposit: 0,
      totalAmount: 20000,
    });
    prisma.booking.findUnique.mockResolvedValue(booking);
    stripe.paymentIntents.retrieve.mockResolvedValue(
      intent({
        id: 'pi_old_rent',
        status: 'requires_capture',
        payment_method: 'pm_old',
      }),
    );
    stripe.paymentIntents.create.mockResolvedValue(
      intent({
        id: 'pi_new_rent',
        status: 'requires_capture',
        payment_method: 'pm_new',
      }),
    );
    const result = await service.confirmBookingPayment(booking.id, booking.guestId, 'pm_new');
    expect(result).toEqual({ status: 'CONFIRMED' });
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_old_rent');
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: 'pm_new' }),
    );
  });

  it('maps insufficient_funds on rent to the stable guest message', async () => {
    const booking = baseBooking({ securityDeposit: 0, totalAmount: 20000 });
    prisma.booking.findUnique.mockResolvedValue(booking);
    stripe.paymentIntents.create.mockRejectedValue(
      stripeCardError('insufficient_funds', 'Your card has insufficient funds.'),
    );
    await expect(
      service.confirmBookingPayment(booking.id, booking.guestId, 'pm_1'),
    ).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({ message: INSUFFICIENT_BALANCE_MESSAGE }),
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'FAILED' }),
      }),
    );
  });
});
