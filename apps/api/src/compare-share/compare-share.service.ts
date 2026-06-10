import { randomBytes } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CompareSharePair, CreateCompareShareResult } from '@repo/shared';

import { RedisService } from '../redis/redis.service';

import type { CreateCompareShareDto } from './dto/create-compare-share.dto';

const SHARE_TTL_SECONDS = 24 * 60 * 60;
const TOKEN_LENGTH = 10;
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Injectable()
export class CompareShareService {
  constructor(private readonly redis: RedisService) {}

  async create(dto: CreateCompareShareDto): Promise<CreateCompareShareResult> {
    if (dto.leftId === dto.rightId) {
      throw new BadRequestException('Cannot share a comparison of a property with itself');
    }
    const token = this.generateToken();
    const payload: CompareSharePair = { leftId: dto.leftId, rightId: dto.rightId };
    await this.redis.setWithTtl(this.buildKey(token), JSON.stringify(payload), SHARE_TTL_SECONDS);
    return { token, expiresInSeconds: SHARE_TTL_SECONDS };
  }

  async resolve(token: string): Promise<CompareSharePair> {
    const raw = await this.redis.get(this.buildKey(token));
    if (!raw) {
      throw new NotFoundException('Share link not found or expired');
    }
    return JSON.parse(raw) as CompareSharePair;
  }

  private buildKey(token: string): string {
    return `share:compare:${token}`;
  }

  private generateToken(): string {
    const bytes = randomBytes(TOKEN_LENGTH);
    let token = '';
    for (const byte of bytes) {
      token += BASE62.charAt(byte % BASE62.length);
    }
    return token;
  }
}
