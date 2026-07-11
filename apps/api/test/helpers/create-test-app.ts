import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import helmet from 'helmet';

import { AppModule } from '../../src/app.module';
import { GeocodingService } from '../../src/geocoding/geocoding.service';
import { StripeCheckoutService } from '../../src/payments/stripe/stripe-checkout.service';
import { StripeConnectService } from '../../src/payments/stripe/stripe-connect.service';
import { RedisService } from '../../src/redis/redis.service';
import { StorageService } from '../../src/storage/storage.service';

import { MockGeocodingService } from './mock-geocoding.service';
import { MockRedisService } from './mock-redis.service';
import { MockStorageService } from './mock-storage.service';
import { MockStripeCheckoutService } from './mock-stripe-checkout.service';
import { MockStripeConnectService } from './mock-stripe-connect.service';

export interface TestAppContext {
  app: INestApplication;
  module: TestingModule;
  storage: MockStorageService;
}

export async function createTestApp(): Promise<TestAppContext> {
  const storage = new MockStorageService();
  const redis = new MockRedisService();
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StorageService)
    .useValue(storage)
    .overrideProvider(RedisService)
    .useValue(redis)
    .overrideProvider(StripeConnectService)
    .useClass(MockStripeConnectService)
    .overrideProvider(StripeCheckoutService)
    .useClass(MockStripeCheckoutService)
    .overrideProvider(GeocodingService)
    .useClass(MockGeocodingService)
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
