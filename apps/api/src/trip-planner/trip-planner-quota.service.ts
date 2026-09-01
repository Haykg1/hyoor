import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { TripPlannerQuotaView } from '@repo/shared';

import { RedisService } from '../redis/redis.service';

import {
  secondsUntilYerevanMidnight,
  TRIP_PLANNER_DAILY_PLANS,
  TRIP_PLANNER_UNITS_PER_PLAN,
  yerevanDateKey,
} from './trip-planner.constants';

const PREFIX = 'trip-planner:quota:';

@Injectable()
export class TripPlannerQuotaService {
  constructor(private readonly redis: RedisService) {}

  async getQuota(userId: string): Promise<TripPlannerQuotaView> {
    this.assertRedis();
    const usedUnits = await this.readUsed(userId);
    const limitUnits = TRIP_PLANNER_DAILY_PLANS * TRIP_PLANNER_UNITS_PER_PLAN;
    const remainingUnits = Math.max(0, limitUnits - usedUnits);
    return {
      limit: TRIP_PLANNER_DAILY_PLANS,
      used: Math.min(TRIP_PLANNER_DAILY_PLANS, usedUnits / TRIP_PLANNER_UNITS_PER_PLAN),
      remaining: remainingUnits / TRIP_PLANNER_UNITS_PER_PLAN,
      unitsRemaining: remainingUnits,
      resetsInSeconds: secondsUntilYerevanMidnight(),
    };
  }

  async consume(userId: string, units: number): Promise<TripPlannerQuotaView> {
    this.assertRedis();
    const key = this.key(userId);
    const ttl = secondsUntilYerevanMidnight();
    const count = await this.redis.incrByWithTtl(key, units, ttl);
    const limitUnits = TRIP_PLANNER_DAILY_PLANS * TRIP_PLANNER_UNITS_PER_PLAN;
    if (count > limitUnits) {
      await this.redis.decrBy(key, units);
      throw new HttpException(
        { message: 'You have used your 4 trip plans for today.', code: 'TRIP_PLANNER_LIMIT' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.getQuota(userId);
  }

  private key(userId: string): string {
    return `${PREFIX}${userId}:${yerevanDateKey()}`;
  }

  private async readUsed(userId: string): Promise<number> {
    const raw = await this.redis.get(this.key(userId));
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private assertRedis(): void {
    if (!this.redis.isConfigured) {
      throw new HttpException('Trip planner quota is unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
