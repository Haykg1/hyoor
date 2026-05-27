import { Injectable } from '@nestjs/common';

@Injectable()
export class MockStorageService {
  private readonly files = new Map<string, Buffer>();

  async uploadFile(key: string, body: Buffer, _contentType: string): Promise<string> {
    this.files.set(key, body);
    return key;
  }

  async getPresignedUrl(key: string, _expiresIn = 3600): Promise<string> {
    return `https://e2e-storage.test/${key}`;
  }

  async getPresignedUploadUrl(
    key: string,
    _contentType: string,
    _expiresIn = 3600,
  ): Promise<string> {
    return `https://e2e-storage.test/upload/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    this.files.delete(key);
  }

  hasFile(key: string): boolean {
    return this.files.has(key);
  }
}
