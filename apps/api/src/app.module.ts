import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NoopThrottlerGuard } from './common/guards/noop-throttler.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import type { AppConfig } from './config/configuration';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { HealthController } from './health/health.controller';
import { HostProfilesModule } from './host-profiles/host-profiles.module';
import { MailModule } from './mail/mail.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PropertiesModule } from './properties/properties.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

const isTestEnv = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => [
        {
          ttl: config.get('security.throttle.ttlMs', { infer: true }),
          limit: config.get('security.throttle.limit', { infer: true }),
        },
      ],
    }),
    DatabaseModule,
    StorageModule,
    MailModule,
    AuthModule,
    UsersModule,
    HostProfilesModule,
    PropertiesModule,
    GeocodingModule,
    AvailabilityModule,
    PaymentsModule,
    BookingsModule,
    MessagingModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: isTestEnv ? NoopThrottlerGuard : ThrottlerGuard },
  ],
})
export class AppModule {}
