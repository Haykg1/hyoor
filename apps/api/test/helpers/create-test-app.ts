import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

import { AppModule } from '../../src/app.module';
import { StorageService } from '../../src/storage/storage.service';

import { MockStorageService } from './mock-storage.service';

export interface TestAppContext {
  app: INestApplication;
  module: TestingModule;
  storage: MockStorageService;
}

export async function createTestApp(): Promise<TestAppContext> {
  const storage = new MockStorageService();
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StorageService)
    .useValue(storage)
    .compile();
  const app = module.createNestApplication();
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  );
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return { app, module, storage };
}
