import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const region = this.config.get('aws.region', { infer: true });
    const accessKeyId = this.config.get('aws.accessKeyId', { infer: true });
    const secretAccessKey = this.config.get('aws.secretAccessKey', { infer: true });
    const endpoint = this.config.get('aws.endpoint', { infer: true });
    this.bucket = this.config.get('aws.bucket', { infer: true });

    this.isConfigured = Boolean(accessKeyId && secretAccessKey && this.bucket);

    if (!this.isConfigured) {
      this.logger.warn(
        'S3 is not configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET missing). ' +
          'File uploads and presigned URLs are disabled.',
      );
    }

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || 'placeholder',
        secretAccessKey: secretAccessKey || 'placeholder',
      },
      endpoint: endpoint || undefined,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    });
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
