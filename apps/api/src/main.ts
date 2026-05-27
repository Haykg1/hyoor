import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const trustProxy = config.get('security.trustProxy', { infer: true });
  const jsonBodyLimit = config.get('security.jsonBodyLimit', { infer: true });
  if (trustProxy) {
    app.set('trust proxy', 1);
  }
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(express.json({ limit: jsonBodyLimit }));
  app.use(express.urlencoded({ limit: jsonBodyLimit, extended: true }));
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({
    origin: config.get('frontend.url', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle('STR Platform API')
    .setDescription('Short Term Rental Platform — Armenia & Worldwide')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health checks')
    .addTag('auth', 'Authentication & SSO')
    .addTag('users', 'User profiles')
    .addTag('host-profiles', 'Host management')
    .addTag('properties', 'Property listings')
    .addTag('availability', 'Calendar & pricing')
    .addTag('bookings', 'Booking lifecycle')
    .addTag('messaging', 'Guest-host conversations')
    .addTag('reviews', 'Reviews & ratings')
    .addTag('notifications', 'In-app notifications')
    .addTag('admin', 'Platform administration')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  const port = config.get('port', { infer: true });
  await app.listen(port);
}

bootstrap();
