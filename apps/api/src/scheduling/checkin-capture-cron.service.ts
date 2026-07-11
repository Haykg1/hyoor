import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../database/prisma.service';
import { StripeCheckoutService } from '../payments/stripe/stripe-checkout.service';

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class CheckinCaptureCronService {
  private readonly logger = new Logger(CheckinCaptureCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckout: StripeCheckoutService,
  ) {}

  /** Captures the rent hold for every booking checking in today, if not cancelled. */
  @Cron('0 4 * * *') // every day at 00:00 UTC
  async captureTodaysCheckIns(): Promise<void> {
    const today = todayUtc();
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        checkIn: today,
        paymentStatus: 'AUTHORIZED',
      },
    });
    let capturedCount = 0;
    for (const booking of bookings) {
      try {
        await this.stripeCheckout.captureRentOnCheckIn(booking);
        capturedCount += 1;
      } catch (error) {
        this.logger.error(`Failed to capture rent for booking ${booking.id}: ${String(error)}`);
      }
    }
    if (capturedCount > 0) {
      this.logger.log(`Captured rent for ${capturedCount} check-in(s) on ${today.toISOString()}`);
    }
  }
}
