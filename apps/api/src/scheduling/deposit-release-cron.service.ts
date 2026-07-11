import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { StripeCheckoutService } from '../payments/stripe/stripe-checkout.service';

@Injectable()
export class DepositReleaseCronService {
  private readonly logger = new Logger(DepositReleaseCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckout: StripeCheckoutService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Releases security-deposit holds once the damage-claim window has passed with
   * no pending claim filed against the booking.
   */
  @Cron('30 4 * * *')
  async releaseExpiredDepositHolds(): Promise<void> {
    const windowHours = this.config.get('stripe.depositClaimWindowHours', { infer: true });
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const candidates = await this.prisma.booking.findMany({
      where: {
        depositStatus: 'AUTHORIZED',
        checkOut: { lte: cutoff },
      },
      include: { securityDepositClaim: true },
    });
    let releasedCount = 0;
    for (const booking of candidates) {
      if (booking.securityDepositClaim && booking.securityDepositClaim.status === 'PENDING') {
        continue;
      }
      try {
        await this.stripeCheckout.releaseDeposit(booking);
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { depositStatus: 'RELEASED' },
        });
        releasedCount += 1;
      } catch (error) {
        this.logger.error(`Failed to release deposit for booking ${booking.id}: ${String(error)}`);
      }
    }
    if (releasedCount > 0) {
      this.logger.log(`Released ${releasedCount} expired security deposit hold(s)`);
    }
  }
}
