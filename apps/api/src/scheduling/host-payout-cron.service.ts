import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../database/prisma.service';
import { StripeCheckoutService } from '../payments/stripe/stripe-checkout.service';

@Injectable()
export class HostPayoutCronService {
  private readonly logger = new Logger(HostPayoutCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckout: StripeCheckoutService,
  ) {}

  /** Transfers captured rent to hosts once their payout delay has elapsed. */
  @Cron('*/15 * * * *') // every 15 min
  async runScheduledPayouts(): Promise<void> {
    const due = await this.prisma.booking.findMany({
      where: {
        payoutStatus: { in: ['SCHEDULED', 'FAILED'] },
        // payoutScheduledAt: { lte: new Date() },
      },
    });
    let paidCount = 0;
    for (const booking of due) {
      try {
        await this.stripeCheckout.payoutToHost(booking);
        paidCount += 1;
      } catch (error) {
        this.logger.error(`Failed to pay out booking ${booking.id}: ${String(error)}`);
      }
    }
    if (paidCount > 0) {
      this.logger.log(`Ran ${paidCount} host payout(s)`);
    }
  }
}
