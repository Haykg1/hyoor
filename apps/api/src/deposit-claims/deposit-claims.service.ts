import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SecurityDepositClaim } from '@repo/database/client';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { StripeCheckoutService } from '../payments/stripe/stripe-checkout.service';

import { CreateDepositClaimDto } from './dto/create-deposit-claim.dto';
import { ReviewDepositClaimDto } from './dto/review-deposit-claim.dto';

@Injectable()
export class DepositClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckout: StripeCheckoutService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async submit(
    bookingId: string,
    hostUserId: string,
    dto: CreateDepositClaimDto,
  ): Promise<SecurityDepositClaim> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true, securityDepositClaim: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const hostProfile = await this.prisma.hostProfile.findUnique({ where: { userId: hostUserId } });
    if (!hostProfile || booking.property.hostId !== hostProfile.id) {
      throw new ForbiddenException('You do not own this booking');
    }
    if (booking.depositStatus !== 'AUTHORIZED') {
      throw new BadRequestException('No security deposit hold is available to claim against');
    }
    if (booking.securityDepositClaim) {
      throw new ConflictException('A damage claim already exists for this booking');
    }
    if (dto.amount > booking.securityDeposit) {
      throw new BadRequestException('Claim amount exceeds the security deposit held');
    }
    const claimWindowHours = this.config.get('stripe.depositClaimWindowHours', { infer: true });
    const deadline = new Date(booking.checkOut.getTime() + claimWindowHours * 60 * 60 * 1000);
    if (new Date() > deadline) {
      throw new BadRequestException('The damage-claim window for this booking has passed');
    }
    return this.prisma.securityDepositClaim.create({
      data: {
        bookingId,
        hostUserId,
        amount: dto.amount,
        reason: dto.reason,
        evidenceKeys: dto.evidenceKeys ?? [],
      },
    });
  }

  async findPending(): Promise<SecurityDepositClaim[]> {
    return this.prisma.securityDepositClaim.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async review(
    claimId: string,
    adminUserId: string,
    dto: ReviewDepositClaimDto,
  ): Promise<SecurityDepositClaim> {
    const claim = await this.prisma.securityDepositClaim.findUnique({
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
      const { stripeTransferId } = await this.stripeCheckout.captureDepositForClaim(
        claim.booking,
        claim.amount,
      );
      return this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: claim.booking.id },
          data: { depositStatus: 'CAPTURED' },
        });
        return tx.securityDepositClaim.update({
          where: { id: claimId },
          data: {
            status: 'APPROVED',
            reviewNote: dto.reviewNote,
            reviewedByUserId: adminUserId,
            reviewedAt: new Date(),
            stripeTransferId,
          },
        });
      });
    }
    await this.stripeCheckout.releaseDeposit(claim.booking);
    return this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: claim.booking.id },
        data: { depositStatus: 'RELEASED' },
      });
      return tx.securityDepositClaim.update({
        where: { id: claimId },
        data: {
          status: 'REJECTED',
          reviewNote: dto.reviewNote,
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
        },
      });
    });
  }
}
