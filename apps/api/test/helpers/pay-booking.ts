import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { authHeader } from './test-data.helper';

/**
 * Drives a booking through the real (non-Stripe) CASH provider: initiate checkout,
 * then simulate the provider webhook — same path production code takes, no mocks.
 */
export async function payBookingWithCash(
  app: INestApplication,
  guestAccessToken: string,
  bookingId: string,
): Promise<void> {
  const checkout = await request(app.getHttpServer())
    .post(`/api/v1/bookings/${bookingId}/checkout`)
    .set(authHeader(guestAccessToken))
    .send({ provider: 'CASH' })
    .expect(200);
  const externalRef = checkout.body.data.externalRef as string;
  await request(app.getHttpServer())
    .post('/api/v1/bookings/webhooks/cash')
    .send({ externalRef })
    .expect(200);
}
