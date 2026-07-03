import { randomUUID } from 'node:crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { OAuthProvider, UserRole } from '@repo/database/client';
import type { AuthTokens, AuthUser, JwtPayload, RefreshJwtPayload } from '@repo/shared';
import * as bcrypt from 'bcryptjs';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerificationService } from './verification.service';

const BCRYPT_ROUNDS = 12;

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  private readonly invalidatedRefreshJtis = new Set<string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly verification: VerificationService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.createWithProfile({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.wantsToHost ? 'HOST' : 'GUEST',
      spokenLanguages: dto.spokenLanguages,
    });
    try {
      await this.verification.sendOtp(user.id);
    } catch (err) {
      this.logger.warn(
        `Failed to dispatch initial OTP for ${user.email}: ${(err as Error).message}`,
      );
    }
    const tokens = await this.generateTokenPair(user.id, user.role);
    return { ...tokens, user: this.toAuthUser(user) };
  }

  sendVerificationOtp(userId: string): Promise<{ sent: true }> {
    return this.verification.sendOtp(userId).then(() => ({ sent: true }));
  }

  verifyEmail(userId: string, code: string): Promise<{ verified: true }> {
    return this.verification.verifyOtp(userId, code);
  }

  async requestPasswordReset(email: string): Promise<{ success: true }> {
    try {
      await this.verification.createPasswordResetToken(email);
    } catch (err) {
      this.logger.warn(`Password reset request failed for ${email}: ${(err as Error).message}`);
    }
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    const { userId } = await this.verification.consumePasswordResetToken(dto.token);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { success: true };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    const tokens = await this.generateTokenPair(user.id, user.role);
    return { ...tokens, user: this.toAuthUser(user) };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (this.invalidatedRefreshJtis.has(payload.jti)) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user?.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    this.invalidatedRefreshJtis.add(payload.jti);
    return this.generateTokenPair(user.id, user.role);
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      });
      this.invalidatedRefreshJtis.add(payload.jti);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { success: true };
  }

  async handleOAuthLogin(
    provider: OAuthProvider,
    providerUserId: string,
    email: string,
    name?: string,
  ): Promise<AuthResponse> {
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      include: { user: true },
    });
    if (existingAccount) {
      const tokens = await this.generateTokenPair(
        existingAccount.user.id,
        existingAccount.user.role,
      );
      return { ...tokens, user: this.toAuthUser(existingAccount.user) };
    }
    const { firstName, lastName } = this.splitName(name, email);
    let user = email ? await this.usersService.findByEmail(email) : null;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          isEmailVerified: true,
          profile: { create: { firstName, lastName } },
        },
        include: { profile: true },
      });
    }
    await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerUserId,
        email,
      },
    });
    const tokens = await this.generateTokenPair(user.id, user.role);
    return { ...tokens, user: this.toAuthUser(user) };
  }

  private async generateTokenPair(userId: string, role: UserRole): Promise<AuthTokens> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const accessPayload: JwtPayload = {
      sub: userId,
      role: role as AuthUser['role'],
      jti: accessJti,
    };
    const refreshPayload: RefreshJwtPayload = { sub: userId, jti: refreshJti };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.config.get('jwt.secret', { infer: true }),
        expiresIn: this.config.get('jwt.expiresIn', { infer: true }),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
        expiresIn: this.config.get('jwt.refreshExpiresIn', { infer: true }),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private splitName(
    name: string | undefined,
    email: string,
  ): { firstName: string; lastName: string } {
    if (!name?.trim()) {
      const local = email.split('@')[0] ?? 'User';
      return { firstName: local, lastName: 'User' };
    }
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] ?? 'User';
    const lastName = parts.slice(1).join(' ') || 'User';
    return { firstName, lastName };
  }

  private toAuthUser(user: { id: string; email: string; role: UserRole }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as AuthUser['role'],
    };
  }
}
