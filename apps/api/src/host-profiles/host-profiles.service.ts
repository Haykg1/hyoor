import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HostProfile, HostType, UserProfile } from '@repo/database/client';
import { MAX_UPLOAD_BYTES, S3_PRESIGNED_URL_EXPIRES } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';

const ALLOWED_LOGO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type HostProfileWithUser = HostProfile & {
  user: { profile: UserProfile | null };
};

export interface PublicHostProfile {
  id: string;
  hostType: HostType;
  displayName: string;
  companyName: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  responseRatePercent: number | null;
  responseTimeHours: number | null;
  avgRating: number | null;
}

@Injectable()
export class HostProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateHostProfileDto): Promise<HostProfileWithUser> {
    const existing = await this.prisma.hostProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Host profile already exists');
    }
    if (dto.hostType === 'COMPANY' && !dto.companyName?.trim()) {
      throw new BadRequestException('Company name is required for company hosts');
    }
    const hostProfile = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: 'HOST' },
      });
      return tx.hostProfile.create({
        data: {
          userId,
          hostType: dto.hostType as HostType,
          companyName: dto.companyName,
          companyRegNumber: dto.companyRegNumber,
          vatNumber: dto.vatNumber,
        },
        include: {
          user: { include: { profile: true } },
        },
      });
    });
    return hostProfile;
  }

  async findByUserId(userId: string): Promise<HostProfileWithUser> {
    const hostProfile = await this.prisma.hostProfile.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!hostProfile) {
      throw new NotFoundException('Host profile not found');
    }
    return hostProfile;
  }

  async update(userId: string, dto: UpdateHostProfileDto): Promise<HostProfileWithUser> {
    const hostProfile = await this.findByUserId(userId);
    if (dto.hostType === 'COMPANY' && dto.companyName !== undefined && !dto.companyName.trim()) {
      throw new BadRequestException('Company name cannot be empty for company hosts');
    }
    const nextHostType = dto.hostType ?? hostProfile.hostType;
    if (nextHostType === 'COMPANY') {
      const companyName = dto.companyName ?? hostProfile.companyName;
      if (!companyName?.trim()) {
        throw new BadRequestException('Company name is required for company hosts');
      }
    }
    return this.prisma.hostProfile.update({
      where: { userId },
      data: dto,
      include: { user: { include: { profile: true } } },
    });
  }

  async uploadLogo(
    userId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ logoKey: string; logoUrl: string }> {
    if (!ALLOWED_LOGO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Logo must be a JPEG, PNG, or WebP image');
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Logo must be smaller than 5MB');
    }
    const hostProfile = await this.findByUserId(userId);
    if (hostProfile.companyLogoKey) {
      await this.storage.deleteFile(hostProfile.companyLogoKey);
    }
    const key = `logos/${userId}/${randomUUID()}.png`;
    await this.storage.uploadFile(key, buffer, mimeType);
    await this.prisma.hostProfile.update({
      where: { userId },
      data: { companyLogoKey: key },
    });
    const logoUrl = await this.storage.getPresignedUrl(key, S3_PRESIGNED_URL_EXPIRES);
    return { logoKey: key, logoUrl };
  }

  async getPublicProfile(id: string): Promise<PublicHostProfile> {
    const hostProfile = await this.prisma.hostProfile.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });
    if (!hostProfile) {
      throw new NotFoundException('Host profile not found');
    }
    let logoUrl: string | null = null;
    if (hostProfile.companyLogoKey) {
      logoUrl = await this.storage.getPresignedUrl(
        hostProfile.companyLogoKey,
        S3_PRESIGNED_URL_EXPIRES,
      );
    }
    const aggregate = await this.prisma.review.aggregate({
      where: {
        target: 'PROPERTY',
        isPublished: true,
        property: { hostId: hostProfile.id },
      },
      _avg: { rating: true },
    });
    const displayName =
      hostProfile.hostType === 'COMPANY' && hostProfile.companyName
        ? hostProfile.companyName
        : `${hostProfile.user.profile?.firstName ?? 'Host'} ${hostProfile.user.profile?.lastName ?? ''}`.trim();
    return {
      id: hostProfile.id,
      hostType: hostProfile.hostType,
      displayName,
      companyName: hostProfile.companyName,
      logoUrl,
      isVerified: hostProfile.isVerified,
      responseRatePercent: hostProfile.responseRatePercent,
      responseTimeHours: hostProfile.responseTimeHours,
      avgRating: aggregate._avg.rating,
    };
  }

  async verify(id: string): Promise<HostProfileWithUser> {
    const hostProfile = await this.prisma.hostProfile.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });
    if (!hostProfile) {
      throw new NotFoundException('Host profile not found');
    }
    return this.prisma.hostProfile.update({
      where: { id },
      data: { isVerified: true },
      include: { user: { include: { profile: true } } },
    });
  }
}
