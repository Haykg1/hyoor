import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentProvider } from '@repo/database/client';

import { PrismaService } from '../database/prisma.service';

import type { CheckoutInitResult } from './payment-provider.interface';
import { PaymentsRegistry } from './payments.registry';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentsRegistry,
  ) {}

  async initiateCheckout(
    bookingId: string,
    guestId: string,
    provider: PaymentProvider,
  ): Promise<CheckoutInitResult> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.guestId !== guestId) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }
    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestException('Booking is already paid');
    }
    if (booking.status === 'CANCELLED_BY_GUEST' || booking.status === 'CANCELLED_BY_HOST') {
      throw new BadRequestException('Cancelled bookings cannot be paid');
    }
    const impl = this.registry.get(provider);
    const result = await impl.initiate(booking);
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentProvider: provider,
        paymentStatus: result.status === 'PAID' ? 'PAID' : 'PENDING',
        paymentInitiatedAt: new Date(),
        paymentCompletedAt: result.status === 'PAID' ? new Date() : null,
        externalPaymentRef: result.externalRef,
      },
    });
    return result;
  }

  async handleWebhook(
    provider: PaymentProvider,
    payload: unknown,
    signature?: string,
  ): Promise<{ received: true }> {
    const impl = this.registry.get(provider);
    const result = await impl.handleWebhook(payload, signature);
    if (!result.externalRef) {
      this.logger.warn(`Webhook from ${provider} missing externalRef`);
      return { received: true };
    }
    const booking = await this.prisma.booking.findFirst({
      where: { externalPaymentRef: result.externalRef, paymentProvider: provider },
    });
    if (!booking) {
      this.logger.warn(`Webhook for unknown booking ref=${result.externalRef}`);
      return { received: true };
    }
    const paid = result.status === 'PAID';
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: result.status,
        paymentCompletedAt: paid ? new Date() : booking.paymentCompletedAt,
        status: paid && booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
      },
    });
    return { received: true };
  }
}
