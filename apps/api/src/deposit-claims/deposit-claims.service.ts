import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Booking, SecurityDepositClaim } from '@repo/database/client';
import type { AdminDepositClaim, PhotoMimeType, SecurityDepositClaimView } from '@repo/shared';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_DEPOSIT_CLAIM_PHOTOS,
  S3_PRESIGNED_URL_EXPIRES,
} from '@repo/shared/constants';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../mail/mailer.service';
import { buildDepositChargedEmail } from '../mail/templates/deposit-charged.template';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeCheckoutService } from '../payments/stripe/stripe-checkout.service';
import { StorageService } from '../storage/storage.service';

import { CreateDepositClaimDto } from './dto/create-deposit-claim.dto';
import { ReviewDepositClaimDto } from './dto/review-deposit-claim.dto';

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

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

@Injectable()
export class DepositClaimsService {
  private readonly logger = new Logger(DepositClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeCheckout: StripeCheckoutService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly mailer: MailerService,
  ) {}

  async createEvidenceUploadUrl(
    bookingId: string,
    hostUserId: string,
    mimeType: PhotoMimeType,
  ): Promise<{ uploadUrl: string; key: string }> {
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, or WebP image');
    }
    const booking = await this.getClaimableBooking(bookingId, hostUserId);
    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const key = `${this.evidenceKeyPrefix(booking)}${randomUUID()}.${ext}`;
    const uploadUrl = await this.storage.getPresignedUploadUrl(
      key,
      mimeType,
      S3_PRESIGNED_URL_EXPIRES,
    );
    return { uploadUrl, key };
  }

  async submit(
    bookingId: string,
    hostUserId: string,
    dto: CreateDepositClaimDto,
  ): Promise<SecurityDepositClaim> {
    const booking = await this.getClaimableBooking(bookingId, hostUserId);
    if (dto.amount > booking.securityDeposit) {
      throw new BadRequestException('Claim amount exceeds the security deposit held');
    }
    const evidenceKeys = dto.evidenceKeys ?? [];
    if (evidenceKeys.length > MAX_DEPOSIT_CLAIM_PHOTOS) {
      throw new BadRequestException(
        `A claim can include at most ${MAX_DEPOSIT_CLAIM_PHOTOS} evidence photos`,
      );
    }
    const prefix = this.evidenceKeyPrefix(booking);
    if (evidenceKeys.some((key) => !key.startsWith(prefix))) {
      throw new BadRequestException('Invalid evidence photo key');
    }
    const claim = await this.prisma.securityDepositClaim.create({
      data: {
        bookingId,
        hostUserId,
        amount: dto.amount,
        reason: dto.reason,
        evidenceKeys,
      },
    });
    await this.notifyClaimSubmitted(booking);
    return claim;
  }

  async releaseByHost(bookingId: string, hostUserId: string): Promise<{ depositStatus: string }> {
    const booking = await this.getClaimableBooking(bookingId, hostUserId, {
      requireWindowOpen: false,
    });
    await this.stripeCheckout.releaseDeposit(booking);
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { depositStatus: 'RELEASED' },
    });
    await this.safeNotify(booking.guestId, 'DEPOSIT_RELEASED', booking.id);
    return { depositStatus: 'RELEASED' };
  }

  async findPendingDetailed(): Promise<AdminDepositClaim[]> {
    const claims = await this.prisma.securityDepositClaim.findMany({
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
    return Promise.all(
      claims.map(async (claim) => {
        const guestProfile = claim.booking.guest.profile;
        const guestName = guestProfile
          ? `${guestProfile.firstName} ${guestProfile.lastName}`.trim()
          : 'Guest';
        return {
          ...(await this.toClaimView(claim)),
          currency: claim.booking.currency,
          securityDeposit: claim.booking.securityDeposit,
          checkIn: claim.booking.checkIn.toISOString(),
          checkOut: claim.booking.checkOut.toISOString(),
          propertyId: claim.booking.property.id,
          propertyTitle: claim.booking.property.title,
          guestName,
          hostName: hostNameById.get(claim.hostUserId) ?? 'Host',
        };
      }),
    );
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
      const reviewed = await this.prisma.$transaction(async (tx) => {
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
      await this.notifyClaimResolved(claim, true);
      await this.sendDepositChargedEmail(claim);
      return reviewed;
    }
    await this.stripeCheckout.releaseDeposit(claim.booking);
    const reviewed = await this.prisma.$transaction(async (tx) => {
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
    await this.notifyClaimResolved(claim, false);
    return reviewed;
  }

  async toClaimView(claim: SecurityDepositClaim): Promise<SecurityDepositClaimView> {
    return {
      id: claim.id,
      bookingId: claim.bookingId,
      amount: claim.amount,
      reason: claim.reason,
      status: claim.status,
      reviewNote: claim.reviewNote,
      reviewedAt: claim.reviewedAt ? claim.reviewedAt.toISOString() : null,
      evidenceUrls: await this.resolveEvidenceUrls(claim.evidenceKeys),
      createdAt: claim.createdAt.toISOString(),
    };
  }

  private async resolveEvidenceUrls(keys: string[]): Promise<string[]> {
    if (keys.length === 0 || !this.storage.isConfigured) return [];
    const urls = await Promise.all(
      keys.map(async (key) => {
        try {
          return await this.storage.getPresignedUrl(key, S3_PRESIGNED_URL_EXPIRES);
        } catch {
          return null;
        }
      }),
    );
    return urls.filter((url): url is string => url !== null);
  }

  private evidenceKeyPrefix(booking: Booking): string {
    return `properties/${booking.propertyId}/deposit-claims/${booking.id}/`;
  }

  private async getClaimableBooking(
    bookingId: string,
    hostUserId: string,
    opts: { requireWindowOpen?: boolean } = {},
  ): Promise<Booking> {
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
      throw new BadRequestException('No security deposit hold is available for this booking');
    }
    if (booking.securityDepositClaim) {
      throw new ConflictException('A damage claim already exists for this booking');
    }
    if (opts.requireWindowOpen === false) return booking;
    const now = new Date();
    if (now < booking.checkOut) {
      throw new BadRequestException('The damage-claim window opens after checkout');
    }
    const claimWindowHours = this.config.get('stripe.depositClaimWindowHours', { infer: true });
    const deadline = new Date(booking.checkOut.getTime() + claimWindowHours * 60 * 60 * 1000);
    if (now > deadline) {
      throw new BadRequestException('The damage-claim window for this booking has passed');
    }
    return booking;
  }

  private async notifyClaimSubmitted(booking: Booking): Promise<void> {
    await this.safeNotify(booking.guestId, 'DEPOSIT_CLAIM_SUBMITTED', booking.id);
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) => this.safeNotify(admin.id, 'DEPOSIT_CLAIM_SUBMITTED', booking.id)),
    );
  }

  private async notifyClaimResolved(
    claim: SecurityDepositClaim & { booking: Booking },
    approved: boolean,
  ): Promise<void> {
    const amountLabel = formatStoredMoney(claim.amount, claim.booking.currency);
    const guestBody = approved
      ? `${amountLabel} was charged from your security deposit for damages.`
      : 'The claim against your security deposit was declined; the hold has been released.';
    const hostBody = approved
      ? `Your claim was approved; ${amountLabel} will be transferred to you.`
      : 'Your security deposit claim was declined; the deposit hold has been released.';
    await this.safeNotifyCustom(
      claim.booking.guestId,
      approved ? 'Security deposit charged' : 'Security deposit released',
      guestBody,
      claim.booking.id,
    );
    await this.safeNotifyCustom(
      claim.hostUserId,
      approved ? 'Deposit claim approved' : 'Deposit claim declined',
      hostBody,
      claim.booking.id,
    );
  }

  private async safeNotify(
    userId: string,
    type: 'DEPOSIT_CLAIM_SUBMITTED' | 'DEPOSIT_RELEASED',
    bookingId: string,
  ): Promise<void> {
    try {
      await this.notifications.notify(userId, type, bookingId, 'booking');
    } catch (error) {
      this.logger.error(`Failed to notify user ${userId}: ${String(error)}`);
    }
  }

  private async safeNotifyCustom(
    userId: string,
    title: string,
    body: string,
    bookingId: string,
  ): Promise<void> {
    try {
      await this.notifications.notifyCustom(
        userId,
        'DEPOSIT_CLAIM_RESOLVED',
        title,
        body,
        bookingId,
        'booking',
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${userId}: ${String(error)}`);
    }
  }

  private async sendDepositChargedEmail(
    claim: SecurityDepositClaim & { booking: Booking },
  ): Promise<void> {
    try {
      const [guest, property] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: claim.booking.guestId },
          include: { profile: true },
        }),
        this.prisma.property.findUnique({
          where: { id: claim.booking.propertyId },
          select: { title: true },
        }),
      ]);
      if (!guest || !property) return;
      const frontendUrl = this.config.get('frontend.url', { infer: true });
      const email = buildDepositChargedEmail({
        guestFirstName: guest.profile?.firstName?.trim() || 'there',
        propertyTitle: property.title,
        checkInDate: formatDisplayDate(claim.booking.checkIn),
        checkOutDate: formatDisplayDate(claim.booking.checkOut),
        amountLabel: formatStoredMoney(claim.amount, claim.booking.currency),
        reason: claim.reason,
        bookingUrl: `${frontendUrl}/bookings/${claim.booking.id}`,
        frontendUrl,
      });
      await this.mailer.send({
        to: guest.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send deposit-charged email for claim ${claim.id}: ${String(error)}`,
      );
    }
  }
}
