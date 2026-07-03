import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type {
  BulkImportJobResponse,
  BulkImportJobRow,
  BulkImportJobStatus,
  BulkImportPreviewRow,
} from '@repo/shared';
import { BULK_IMPORT_JOB_TTL_SECONDS, BULK_IMPORT_PREVIEW_TTL_SECONDS } from '@repo/shared';

import { RedisService } from '../../redis/redis.service';

const PREVIEW_KEY = (id: string): string => `bulk-import:preview:${id}`;
const JOB_KEY = (id: string): string => `bulk-import:job:${id}`;

export interface BulkImportPreviewData {
  previewId: string;
  rows: BulkImportPreviewRow[];
}

export interface BulkImportJobData {
  jobId: string;
  status: BulkImportJobStatus;
  hostUserId: string;
  recipientEmail: string;
  locale: string;
  previewId: string;
  startedAt: string;
  completedAt?: string;
  summary?: { total: number; created: number; failed: number };
  rows?: BulkImportJobRow[];
}

@Injectable()
export class BulkImportJobStore {
  constructor(private readonly redis: RedisService) {}

  async savePreview(data: BulkImportPreviewData): Promise<void> {
    await this.redis.setWithTtl(
      PREVIEW_KEY(data.previewId),
      JSON.stringify(data),
      BULK_IMPORT_PREVIEW_TTL_SECONDS,
    );
  }

  async loadPreview(previewId: string): Promise<BulkImportPreviewData | null> {
    const raw = await this.redis.get(PREVIEW_KEY(previewId));
    if (!raw) return null;
    return JSON.parse(raw) as BulkImportPreviewData;
  }

  async deletePreview(previewId: string): Promise<void> {
    await this.redis.del(PREVIEW_KEY(previewId));
  }

  async createJob(data: Omit<BulkImportJobData, 'jobId'>): Promise<string> {
    const jobId = randomUUID();
    const job: BulkImportJobData = { jobId, ...data };
    await this.redis.setWithTtl(JOB_KEY(jobId), JSON.stringify(job), BULK_IMPORT_JOB_TTL_SECONDS);
    return jobId;
  }

  async updateJob(jobId: string, patch: Partial<BulkImportJobData>): Promise<void> {
    const existing = await this.loadJob(jobId);
    if (!existing) return;
    const updated: BulkImportJobData = { ...existing, ...patch };
    await this.redis.setWithTtl(
      JOB_KEY(jobId),
      JSON.stringify(updated),
      BULK_IMPORT_JOB_TTL_SECONDS,
    );
  }

  async loadJob(jobId: string): Promise<BulkImportJobData | null> {
    const raw = await this.redis.get(JOB_KEY(jobId));
    if (!raw) return null;
    return JSON.parse(raw) as BulkImportJobData;
  }

  toJobResponse(job: BulkImportJobData): BulkImportJobResponse {
    return {
      jobId: job.jobId,
      status: job.status,
      summary: job.summary,
      rows: job.rows,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }
}

export { generatePreviewId };

function generatePreviewId(): string {
  return randomUUID() as string;
}
