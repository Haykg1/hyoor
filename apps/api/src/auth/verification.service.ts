import { createHash, randomBytes, randomInt } from 'node:crypto';

import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../mail/mailer.service';
import { buildOtpEmail } from '../mail/templates/otp.template';
import { buildPasswordResetEmail } from '../mail/templates/password-reset.template';

const OTP_TTL_MINUTES = 10;
const OTP_BCRYPT_ROUNDS = 10;
const OTP_HOURLY_LIMIT = 5;
const RESET_TTL_MINUTES = 30;
const RESET_TOKEN_BYTES = 32;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger('VerificationService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async sendOtp(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }
    const recentCount = await this.prisma.emailVerificationCode.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentCount >= OTP_HOURLY_LIMIT) {
      throw new HttpException(
        'Too many verification attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, OTP_BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await this.prisma.emailVerificationCode.create({
      data: { userId, codeHash, expiresAt },
    });
    const email = buildOtpEmail(code, OTP_TTL_MINUTES);
    try {
      await this.mailer.send({
        to: user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP to ${user.email}: ${(err as Error).message}`);
      throw err;
    }
  }

  async verifyOtp(userId: string, code: string): Promise<{ verified: true }> {
    const candidates = await this.prisma.emailVerificationCode.findMany({
      where: {
        userId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    if (candidates.length === 0) {
      throw new BadRequestException('No active verification code. Request a new one.');
    }
    let match: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop -- bcrypt compare per candidate is fine; capped at 5
      if (await bcrypt.compare(code, candidate.codeHash)) {
        match = candidate;
        break;
      }
    }
    if (!match) {
      throw new BadRequestException('Invalid verification code');
    }
    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.update({
        where: { id: match.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true },
      }),
    ]);
    return { verified: true };
  }

  async createPasswordResetToken(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !user.isActive) {
      this.logger.debug(`Skipping password reset for ${email}: not eligible`);
      return;
    }
    const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    const frontendUrl = this.config.get('frontend.url', { infer: true });
    const resetUrl = new URL('/auth/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', token);
    const mail = buildPasswordResetEmail(resetUrl.toString(), RESET_TTL_MINUTES);
    try {
      await this.mailer.send({
        to: user.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } catch (err) {
      this.logger.error(`Failed to send reset link to ${user.email}: ${(err as Error).message}`);
      throw err;
    }
  }

  async consumePasswordResetToken(token: string): Promise<{ userId: string }> {
    const tokenHash = hashToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { userId: record.userId };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
