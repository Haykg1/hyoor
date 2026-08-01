import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import {
  createActivePropertyDirect,
  registerHostUser,
  type RegisteredHostUser,
} from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import {
  authHeader,
  registerUser,
  uniqueEmail,
  type RegisteredUser,
} from '../helpers/test-data.helper';

async function registerAdmin(
  app: INestApplication,
): Promise<RegisteredUser & { accessToken: string }> {
  const admin = await registerUser(app, { email: uniqueEmail('admin') });
  const prisma = app.get(PrismaService);
  await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: admin.email, password: admin.password })
    .expect(201);
  return { ...admin, accessToken: login.body.data.accessToken as string };
}

interface PaidBooking {
  bookingId: string;
  propertyId: string;
  rentAmount: number;
  checkIn: string;
  checkOut: string;
}

async function createPaidBooking(
  app: INestApplication,
  host: RegisteredHostUser,
  guest: RegisteredUser,
  fee: { type: 'PERCENT' | 'FIXED'; value: number },
  opts: { checkIn?: string; checkOut?: string; confirmPayment?: boolean } = {},
): Promise<PaidBooking> {
  const property = await createActivePropertyDirect(app, host);
  const prisma = app.get(PrismaService);
  await prisma.property.update({
    where: { id: property.id },
    data: {
      cancellationPolicy: 'MODERATE',
      cancellationFeeType: fee.type,
      cancellationFeeValue: fee.value,
    },
  });
  const checkIn = opts.checkIn ?? '2027-12-01';
  const checkOut = opts.checkOut ?? '2027-12-04';
  const create = await request(app.getHttpServer())
    .post('/api/v1/bookings')
    .set(authHeader(guest.accessToken))
    .send({ propertyId: property.id, checkIn, checkOut, guestCount: 2 })
    .expect(201);
  const bookingId = create.body.data.id as string;
  const rentAmount =
    (create.body.data.totalAmount as number) - (create.body.data.securityDeposit as number);
  if (opts.confirmPayment !== false) {
    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/payment/confirm`)
      .set(authHeader(guest.accessToken))
      .send({ paymentMethodId: 'pm_mock_test' })
      .expect(200);
  }
  return { bookingId, propertyId: property.id, rentAmount, checkIn, checkOut };
}

describe('Cancellation fee claims (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetE2eDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('host cancellation routing', () => {
    it('applies the fee immediately on guest cancels without creating a claim', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, rentAmount } = await createPaidBooking(app, host, guest, {
        type: 'PERCENT',
        value: 20,
      });
      const cancel = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(guest.accessToken))
        .send({ reason: 'Change of plans' })
        .expect(200);
      expect(cancel.body.data.status).toBe('CANCELLED_BY_GUEST');
      expect(cancel.body.data.paymentStatus).toBe('PARTIALLY_REFUNDED');
      expect(cancel.body.data.refundedAmount).toBe(
        rentAmount - Math.round((rentAmount * 20) / 100),
      );
      const prisma = app.get(PrismaService);
      const claim = await prisma.cancellationFeeClaim.findUnique({ where: { bookingId } });
      expect(claim).toBeNull();
    });

    it('refunds in full without a claim when the host waives the fee', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, rentAmount } = await createPaidBooking(app, host, guest, {
        type: 'FIXED',
        value: 8000,
      });
      const cancel = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ reason: 'Renovation needed' })
        .expect(200);
      expect(cancel.body.data.status).toBe('CANCELLED_BY_HOST');
      expect(cancel.body.data.paymentStatus).toBe('CANCELLED');
      expect(cancel.body.data.refundedAmount).toBe(rentAmount);
      const prisma = app.get(PrismaService);
      const claim = await prisma.cancellationFeeClaim.findUnique({ where: { bookingId } });
      expect(claim).toBeNull();
    });

    it('skips review and refunds fully when the configured fee is zero', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, rentAmount } = await createPaidBooking(app, host, guest, {
        type: 'PERCENT',
        value: 0,
      });
      const cancel = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ applyCancellationFee: true, reason: 'No fee configured anyway' })
        .expect(200);
      expect(cancel.body.data.paymentStatus).toBe('CANCELLED');
      expect(cancel.body.data.refundedAmount).toBe(rentAmount);
      const prisma = app.get(PrismaService);
      const claim = await prisma.cancellationFeeClaim.findUnique({ where: { bookingId } });
      expect(claim).toBeNull();
    });

    it('skips review when the booking was never paid (no rent hold)', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createPaidBooking(
        app,
        host,
        guest,
        { type: 'PERCENT', value: 25 },
        { confirmPayment: false },
      );
      const cancel = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ applyCancellationFee: true, reason: 'Cancelling unpaid booking' })
        .expect(200);
      expect(cancel.body.data.status).toBe('CANCELLED_BY_HOST');
      expect(cancel.body.data.paymentStatus).toBe('CANCELLED');
      const prisma = app.get(PrismaService);
      const claim = await prisma.cancellationFeeClaim.findUnique({ where: { bookingId } });
      expect(claim).toBeNull();
    });

    it('releases the security deposit while the rent hold awaits review', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createPaidBooking(app, host, guest, {
        type: 'FIXED',
        value: 5000,
      });
      const prisma = app.get(PrismaService);
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          securityDeposit: 20000,
          totalAmount: { increment: 20000 },
          stripeDepositPaymentIntentId: `pi_mock_deposit_${bookingId}`,
          depositStatus: 'AUTHORIZED',
        },
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ applyCancellationFee: true, reason: 'Guest asked to cancel' })
        .expect(200);
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(booking.depositStatus).toBe('RELEASED');
      expect(booking.paymentStatus).toBe('AUTHORIZED');
      const claim = await prisma.cancellationFeeClaim.findUniqueOrThrow({ where: { bookingId } });
      expect(claim.status).toBe('PENDING');
      expect(claim.amount).toBe(5000);
    });

    it('reopens the dates for new bookings while the fee is still under review', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, propertyId, checkIn, checkOut } = await createPaidBooking(
        app,
        host,
        guest,
        { type: 'PERCENT', value: 15 },
      );
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ applyCancellationFee: true, reason: 'Guest asked to cancel' })
        .expect(200);
      const otherGuest = await registerUser(app, { email: uniqueEmail('guest2') });
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(authHeader(otherGuest.accessToken))
        .send({ propertyId, checkIn, checkOut, guestCount: 2 })
        .expect(201);
    });
  });

  describe('admin review endpoints', () => {
    it('rejects unauthenticated and non-admin access to the claims list', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/cancellation-fee-claims').expect(401);
      const host = await registerHostUser(app);
      await request(app.getHttpServer())
        .get('/api/v1/admin/cancellation-fee-claims')
        .set(authHeader(host.accessToken))
        .expect(403);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      await request(app.getHttpServer())
        .get('/api/v1/admin/cancellation-fee-claims')
        .set(authHeader(guest.accessToken))
        .expect(403);
    });

    it('rejects non-admin review attempts', async () => {
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createPaidBooking(app, host, guest, {
        type: 'PERCENT',
        value: 10,
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ applyCancellationFee: true, reason: 'Guest asked to cancel' })
        .expect(200);
      const prisma = app.get(PrismaService);
      const claim = await prisma.cancellationFeeClaim.findUniqueOrThrow({ where: { bookingId } });
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/cancellation-fee-claims/${claim.id}`)
        .set(authHeader(host.accessToken))
        .send({ status: 'APPROVED' })
        .expect(403);
      const unchanged = await prisma.cancellationFeeClaim.findUniqueOrThrow({
        where: { id: claim.id },
      });
      expect(unchanged.status).toBe('PENDING');
    });

    it('returns 404 for a nonexistent claim and 400 for an invalid status', async () => {
      const admin = await registerAdmin(app);
      await request(app.getHttpServer())
        .patch('/api/v1/admin/cancellation-fee-claims/nonexistent-claim-id')
        .set(authHeader(admin.accessToken))
        .send({ status: 'APPROVED' })
        .expect(404);
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId } = await createPaidBooking(app, host, guest, {
        type: 'PERCENT',
        value: 10,
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ applyCancellationFee: true, reason: 'Guest asked to cancel' })
        .expect(200);
      const prisma = app.get(PrismaService);
      const claim = await prisma.cancellationFeeClaim.findUniqueOrThrow({ where: { bookingId } });
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/cancellation-fee-claims/${claim.id}`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'MAYBE' })
        .expect(400);
    });

    it('lists pending claims with booking context and hides reviewed ones', async () => {
      const admin = await registerAdmin(app);
      const host = await registerHostUser(app);
      const guest = await registerUser(app, { email: uniqueEmail('guest') });
      const { bookingId, rentAmount } = await createPaidBooking(app, host, guest, {
        type: 'FIXED',
        value: 7000,
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(host.accessToken))
        .send({ applyCancellationFee: true, reason: 'Guest asked to cancel' })
        .expect(200);
      const list = await request(app.getHttpServer())
        .get('/api/v1/admin/cancellation-fee-claims')
        .set(authHeader(admin.accessToken))
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({
        bookingId,
        amount: 7000,
        rentAmount,
        status: 'PENDING',
        reason: 'Guest asked to cancel',
      });
      const prisma = app.get(PrismaService);
      const claim = await prisma.cancellationFeeClaim.findUniqueOrThrow({ where: { bookingId } });
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/cancellation-fee-claims/${claim.id}`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'REJECTED' })
        .expect(200);
      const listAfter = await request(app.getHttpServer())
        .get('/api/v1/admin/cancellation-fee-claims')
        .set(authHeader(admin.accessToken))
        .expect(200);
      expect(listAfter.body.data).toHaveLength(0);
    });
  });
});
