import { Injectable, MessageEvent } from '@nestjs/common';
import type { TripPlanProgressEvent } from '@repo/shared';
import { Observable } from 'rxjs';

import { RedisService } from '../redis/redis.service';

import { TRIP_PLANNER_JOB_TTL_SECONDS } from './trip-planner.constants';

export interface TripPlanJobState {
  status: 'running' | 'ready' | 'failed';
  events: TripPlanProgressEvent[];
}

@Injectable()
export class TripPlannerJobService {
  constructor(private readonly redis: RedisService) {}

  jobKey(planId: string): string {
    return `trip-planner:job:${planId}`;
  }

  channel(planId: string): string {
    return `trip-planner:progress:${planId}`;
  }

  async read(planId: string): Promise<TripPlanJobState | null> {
    const raw = await this.redis.get(this.jobKey(planId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TripPlanJobState;
    } catch {
      return null;
    }
  }

  async start(planId: string): Promise<void> {
    await this.write(planId, { status: 'running', events: [] });
  }

  async append(
    planId: string,
    event: TripPlanProgressEvent,
    status: TripPlanJobState['status'] = 'running',
  ): Promise<void> {
    const current = (await this.read(planId)) ?? { status: 'running', events: [] };
    current.status = status;
    current.events.push(event);
    await this.write(planId, current);
    await this.redis.publish(this.channel(planId), JSON.stringify(event));
  }

  stream(planId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const channel = this.channel(planId);
      let completed = false;
      const emit = (event: TripPlanProgressEvent): void => {
        subscriber.next({ data: event });
        if (event.type === 'ready' || event.type === 'failed') {
          completed = true;
          subscriber.complete();
        }
      };
      const handler = (message: string): void => {
        if (completed) return;
        try {
          emit(JSON.parse(message) as TripPlanProgressEvent);
        } catch {
          subscriber.error(new Error('Invalid trip planner progress event'));
        }
      };
      void this.read(planId).then((job) => {
        if (completed) return;
        if (job) {
          for (const event of job.events) {
            if (completed) return;
            emit(event);
          }
        }
        if (completed) return;
        void this.redis.subscribe(channel, handler);
      });
      return () => {
        void this.redis.unsubscribe(channel, handler);
      };
    });
  }

  private async write(planId: string, state: TripPlanJobState): Promise<void> {
    await this.redis.setWithTtl(
      this.jobKey(planId),
      JSON.stringify(state),
      TRIP_PLANNER_JOB_TTL_SECONDS,
    );
  }
}
