import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Booking, CancellationFeeClaim } from '@repo/database/client';
import type { AdminCancellationFeeClaim, CancellationFeeClaimView } from '@repo/shared';

import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeCheckoutService } from '../payments/stripe/stripe-checkout.service';

import { ReviewCancellationClaimDto } from './dto/review-cancellation-claim.dto';

const ZERO_PRECISION_CURRENCIES = new Set(['AMD', 'JPY', 'KRW', 'VND']);

function formatStoredMoney(minor: number, currencyCode: string): string {
  const precision = ZERO_PRECISION_CURRENCIES.has(currencyCode.toUpperCase()) ? 0 : 2;
  const major = precision === 0 ? minor : minor / 100;
  const value = major.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${value} ${currencyCode.toUpperCase()}`;
}

@Injectable()
export class CancellationClaimsService {
  private readonly logger = new Logger(CancellationClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckout: StripeCheckoutService,
    private readonly notifications: NotificationsService,
  ) {}

  async findPendingDetailed(): Promise<AdminCancellationFeeClaim[]> {
    const claims = await this.prisma.cancellationFeeClaim.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        booking: {
          include: {
            property: { select: { id: true, title: true } },
            guest: { include: { profile: true } },
          },
        },
      },
    });
    const hostUserIds = [...new Set(claims.map((claim) => claim.hostUserId))];
    const hosts = await this.prisma.user.findMany({
      where: { id: { in: hostUserIds } },
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
        hostProfile: { select: { hostType: true, companyName: true } },
      },
    });
    const hostNameById = new Map(
      hosts.map((host) => {
        const companyName =
          host.hostProfile?.hostType === 'COMPANY' ? host.hostProfile.companyName : null;
        const profileName = host.profile
          ? `${host.profile.firstName} ${host.profile.lastName}`.trim()
          : '';
        return [host.id, companyName || profileName || 'Host'];
      }),
    );
    return claims.map((claim) => {
      const guestProfile = claim.booking.guest.profile;
      const guestName = guestProfile
        ? `${guestProfile.firstName} ${guestProfile.lastName}`.trim()
        : 'Guest';
      return {
        ...this.toClaimView(claim),
        currency: claim.booking.currency,
        rentAmount: claim.booking.totalAmount - claim.booking.securityDeposit,
        checkIn: claim.booking.checkIn.toISOString(),
        checkOut: claim.booking.checkOut.toISOString(),
        propertyId: claim.booking.property.id,
        propertyTitle: claim.booking.property.title,
        guestName,
        hostName: hostNameById.get(claim.hostUserId) ?? 'Host',
      };
    });
  }

  async review(
    claimId: string,
    adminUserId: string,
    dto: ReviewCancellationClaimDto,
  ): Promise<CancellationFeeClaim> {
    const claim = await this.prisma.cancellationFeeClaim.findUnique({
      where: { id: claimId },
      include: { booking: true },
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }
    if (claim.status !== 'PENDING') {
      throw new BadRequestException('This claim has already been reviewed');
    }
    if (dto.status === 'APPROVED') {
      await this.stripeCheckout.captureCancellationFee(claim.booking, claim.amount);
    } else {
      await this.stripeCheckout.cancelBookingPayment(claim.booking, false);
    }
    const reviewed = await this.prisma.cancellationFeeClaim.update({
      where: { id: claimId },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote,
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
      },
    });
    await this.notifyClaimResolved(claim, dto.status === 'APPROVED');
    return reviewed;
  }

  toClaimView(claim: CancellationFeeClaim): CancellationFeeClaimView {
    return {
      id: claim.id,
      bookingId: claim.bookingId,
      amount: claim.amount,
      reason: claim.reason,
      status: claim.status,
      reviewNote: claim.reviewNote,
      reviewedAt: claim.reviewedAt ? claim.reviewedAt.toISOString() : null,
      createdAt: claim.createdAt.toISOString(),
    };
  }

  private async notifyClaimResolved(
    claim: CancellationFeeClaim & { booking: Booking },
    approved: boolean,
  ): Promise<void> {
    const amountLabel = formatStoredMoney(claim.amount, claim.booking.currency);
    const guestBody = approved
      ? `The ${amountLabel} cancellation fee for your cancelled booking was approved and charged; the remainder of your payment hold has been released.`
      : 'The cancellation fee for your cancelled booking was declined; your full payment hold has been released.';
    const hostBody = approved
      ? `Your cancellation fee of ${amountLabel} was approved and will be paid out.`
      : 'Your cancellation fee was declined; the guest was refunded in full.';
    await this.safeNotify(
      claim.booking.guestId,
      approved ? 'Cancellation fee charged' : 'Cancellation fee declined',
      guestBody,
      claim.booking.id,
    );
    await this.safeNotify(
      claim.hostUserId,
      approved ? 'Cancellation fee approved' : 'Cancellation fee declined',
      hostBody,
      claim.booking.id,
    );
  }

  private async safeNotify(
    userId: string,
    title: string,
    body: string,
    bookingId: string,
  ): Promise<void> {
    try {
      await this.notifications.notifyCustom(
        userId,
        'CANCELLATION_FEE_REVIEW',
        title,
        body,
        bookingId,
        'booking',
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${userId}: ${String(error)}`);
    }
  }
}
