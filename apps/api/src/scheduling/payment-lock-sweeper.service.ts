import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AvailabilityService } from '../availability/availability.service';
import { PrismaService } from '../database/prisma.service';
import { PaymentFailuresService } from '../payment-failures/payment-failures.service';
import { PromotionsService } from '../promotions/promotions.service';

@Injectable()
export class PaymentLockSweeperService {
  private readonly logger = new Logger(PaymentLockSweeperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly promotions: PromotionsService,
    private readonly paymentFailures: PaymentFailuresService,
  ) {}

  @Cron('*/1 * * * *')
  async sweepExpiredPaymentLocks(): Promise<void> {
    const expired = await this.prisma.booking.findMany({
      where: {
        status: 'AWAITING_PAYMENT',
        paymentLockExpiresAt: { lt: new Date() },
      },
    });
    let sweptCount = 0;
    for (const booking of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'PAYMENT_EXPIRED', cancelledAt: new Date() },
          });
          if (booking.promotionId) {
            await this.promotions.decrementAppliedCount(booking.promotionId, tx);
          }
        });
        await this.availability.unblockDatesForBooking(
          booking.propertyId,
          booking.checkIn,
          booking.checkOut,
        );
        sweptCount += 1;
      } catch (error) {
        this.logger.error(
          `Failed to expire payment lock for booking ${booking.id}: ${String(error)}`,
        );
        await this.paymentFailures.record(booking.id, 'PAYMENT_LOCK_SWEEP_FAILED', error);
      }
    }
    if (sweptCount > 0) {
      this.logger.log(`Expired ${sweptCount} abandoned payment lock(s)`);
    }
  }
}
