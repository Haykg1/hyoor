import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { authHeader, registerUser, type RegisteredUser } from './test-data.helper';

export interface RegisteredHostUser extends RegisteredUser {
  hostProfileId: string;
}

export async function registerHostUser(app: INestApplication): Promise<RegisteredHostUser> {
  const user = await registerUser(app);
  const createHost = await request(app.getHttpServer())
    .post('/api/v1/host-profiles')
    .set(authHeader(user.accessToken))
    .send({ hostType: 'INDIVIDUAL' })
    .expect(201);
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(201);
  return {
    ...user,
    accessToken: login.body.data.accessToken as string,
    refreshToken: login.body.data.refreshToken as string,
    hostProfileId: createHost.body.data.id as string,
  };
}

export const sampleProperty = {
  title: 'Cozy Yerevan Apartment',
  description: 'A bright apartment in central Yerevan.',
  propertyType: 'APARTMENT',
  city: 'Yerevan',
  country: 'AM',
  maxGuests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  pricePerNight: 25000,
  cancellationPolicy: 'MODERATE',
};

export async function createHostProperty(
  app: INestApplication,
  host: RegisteredHostUser,
): Promise<{ id: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/properties')
    .set(authHeader(host.accessToken))
    .send(sampleProperty)
    .expect(201);
  return { id: response.body.data.id as string };
}

export async function createActiveHostProperty(
  app: INestApplication,
  host: RegisteredHostUser,
): Promise<{ id: string }> {
  const property = await createHostProperty(app, host);
  const prisma = app.get(PrismaService);
  await prisma.property.update({
    where: { id: property.id },
    data: { status: 'ACTIVE' },
  });
  return property;
}

export async function createGuestBooking(
  app: INestApplication,
  host: RegisteredHostUser,
  guest: RegisteredUser,
  overrides: Partial<{
    checkIn: string;
    checkOut: string;
    guestCount: number;
  }> = {},
): Promise<{ bookingId: string; conversationId: string; propertyId: string }> {
  const property = await createActiveHostProperty(app, host);
  const response = await request(app.getHttpServer())
    .post('/api/v1/bookings')
    .set(authHeader(guest.accessToken))
    .send({
      propertyId: property.id,
      checkIn: overrides.checkIn ?? '2025-07-10',
      checkOut: overrides.checkOut ?? '2025-07-13',
      guestCount: overrides.guestCount ?? 2,
    })
    .expect(201);
  return {
    bookingId: response.body.data.id as string,
    conversationId: response.body.data.conversationId as string,
    propertyId: property.id,
  };
}

export async function createCompletedGuestBooking(
  app: INestApplication,
  host: RegisteredHostUser,
  guest: RegisteredUser,
  overrides: Partial<{
    checkIn: string;
    checkOut: string;
    guestCount: number;
  }> = {},
): Promise<{ bookingId: string; conversationId: string; propertyId: string }> {
  const booking = await createGuestBooking(app, host, guest, overrides);
  const prisma = app.get(PrismaService);
  await prisma.booking.update({
    where: { id: booking.bookingId },
    data: { status: 'COMPLETED' },
  });
  return booking;
}
