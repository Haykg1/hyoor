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
  private readonly propertiesBucket: string;
  private readonly avatarsBucket: string;
  readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const region = this.config.get('aws.region', { infer: true });
    const accessKeyId = this.config.get('aws.accessKeyId', { infer: true });
    const secretAccessKey = this.config.get('aws.secretAccessKey', { infer: true });
    const endpoint = this.config.get('aws.endpoint', { infer: true });
    this.propertiesBucket = this.config.get('aws.propertiesBucket', { infer: true });
    this.avatarsBucket = this.config.get('aws.avatarsBucket', { infer: true });
    this.isConfigured = Boolean(
      accessKeyId && secretAccessKey && this.propertiesBucket && this.avatarsBucket,
    );
    if (!this.isConfigured) {
      this.logger.warn(
        'S3 is not configured (AWS credentials or bucket names missing). ' +
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

  private resolveBucket(key: string): string {
    if (key.startsWith('properties/')) return this.propertiesBucket;
    if (key.startsWith('avatars/') || key.startsWith('logos/')) return this.avatarsBucket;
    return this.propertiesBucket;
  }

  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.resolveBucket(key),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.resolveBucket(key), Key: key }),
      { expiresIn },
    );
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.resolveBucket(key),
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.isConfigured) throw new Error('S3 is not configured');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.resolveBucket(key), Key: key }));
  }
}
