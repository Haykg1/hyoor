import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User, UserProfile } from '@repo/database/client';
import { MAX_UPLOAD_BYTES, S3_PRESIGNED_URL_EXPIRES } from '@repo/shared/constants';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BCRYPT_ROUNDS = 12;
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type UserWithProfile = User & { profile: UserProfile | null };

export type SafeUserWithProfile = Omit<UserWithProfile, 'passwordHash'>;

export type UserMeResponse = SafeUserWithProfile & { avatarUrl: string | null };

function omitPasswordHash(user: UserWithProfile): SafeUserWithProfile {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally omitted from response
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export interface PublicUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  hostRating: number | null;
  isHost: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  findByEmail(email: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  findById(id: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, hostProfile: true },
    });
  }

  async createWithProfile(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role?: 'GUEST' | 'HOST';
  }): Promise<UserWithProfile> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? 'GUEST',
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        },
      },
      include: { profile: true },
    });
  }

  async getMe(userId: string): Promise<UserMeResponse> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const safe = omitPasswordHash(user);
    let avatarUrl: string | null = null;
    if (user.profile?.avatarKey) {
      avatarUrl = await this.storage.getPresignedUrl(
        user.profile.avatarKey,
        S3_PRESIGNED_URL_EXPIRES,
      );
    }
    return { ...safe, avatarUrl };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserMeResponse> {
    const user = await this.findById(userId);
    if (!user?.profile) {
      throw new NotFoundException('User profile not found');
    }
    await this.prisma.userProfile.update({
      where: { userId },
      data: dto,
    });
    return this.getMe(userId);
  }

  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ avatarKey: string; avatarUrl: string }> {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Avatar must be a JPEG, PNG, or WebP image');
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Avatar must be smaller than 5MB');
    }
    const user = await this.findById(userId);
    if (!user?.profile) {
      throw new NotFoundException('User profile not found');
    }
    if (user.profile.avatarKey) {
      await this.storage.deleteFile(user.profile.avatarKey);
    }
    const key = `avatars/${userId}/${randomUUID()}.jpg`;
    await this.storage.uploadFile(key, buffer, mimeType);
    await this.prisma.userProfile.update({
      where: { userId },
      data: { avatarKey: key },
    });
    const avatarUrl = await this.storage.getPresignedUrl(key, S3_PRESIGNED_URL_EXPIRES);
    return { avatarKey: key, avatarUrl };
  }

  async deleteAvatar(userId: string): Promise<{ success: true }> {
    const user = await this.findById(userId);
    if (!user?.profile) {
      throw new NotFoundException('User profile not found');
    }
    if (user.profile.avatarKey) {
      await this.storage.deleteFile(user.profile.avatarKey);
      await this.prisma.userProfile.update({
        where: { userId },
        data: { avatarKey: null },
      });
    }
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('Password login is not available for this account');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { success: true };
  }

  async getPublicProfile(id: string): Promise<PublicUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, hostProfile: true },
    });
    if (!user?.profile) {
      throw new NotFoundException('User not found');
    }
    let avatarUrl: string | null = null;
    if (user.profile.avatarKey) {
      avatarUrl = await this.storage.getPresignedUrl(
        user.profile.avatarKey,
        S3_PRESIGNED_URL_EXPIRES,
      );
    }
    let hostRating: number | null = null;
    if (user.hostProfile) {
      const aggregate = await this.prisma.review.aggregate({
        where: {
          target: 'PROPERTY',
          isPublished: true,
          property: { hostId: user.hostProfile.id },
        },
        _avg: { rating: true },
      });
      hostRating = aggregate._avg.rating;
    }
    return {
      id: user.id,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      avatarUrl,
      hostRating,
      isHost: Boolean(user.hostProfile),
    };
  }
}
