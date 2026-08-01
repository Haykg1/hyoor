import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CancellationClaimsService } from './cancellation-claims.service';

type MockedClaim = ReturnType<typeof buildClaim>;

function buildClaim(overrides: Partial<Record<string, unknown>> = {}): {
  id: string;
  bookingId: string;
  hostUserId: string;
  amount: number;
  reason: string | null;
  status: string;
  reviewNote: string | null;
  reviewedByUserId: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  booking: {
    id: string;
    guestId: string;
    currency: string;
    totalAmount: number;
    securityDeposit: number;
    checkIn: Date;
    checkOut: Date;
    property: { id: string; title: string };
    guest: { profile: { firstName: string; lastName: string } | null };
  };
} {
  return {
    id: 'claim_1',
    bookingId: 'booking_1',
    hostUserId: 'host_user_1',
    amount: 10000,
    reason: 'Guest asked me to cancel',
    status: 'PENDING',
    reviewNote: null,
    reviewedByUserId: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    reviewedAt: null,
    booking: {
      id: 'booking_1',
      guestId: 'guest_user_1',
      currency: 'AMD',
      totalAmount: 120000,
      securityDeposit: 20000,
      checkIn: new Date('2026-09-01T00:00:00.000Z'),
      checkOut: new Date('2026-09-04T00:00:00.000Z'),
      property: { id: 'property_1', title: 'Test flat' },
      guest: { profile: { firstName: 'Anna', lastName: 'Guest' } },
    },
    ...overrides,
  };
}

describe('CancellationClaimsService', () => {
  let prisma: {
    cancellationFeeClaim: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };
  let stripeCheckout: {
    captureCancellationFee: jest.Mock;
    cancelBookingPayment: jest.Mock;
  };
  let notifications: { notifyCustom: jest.Mock };
  let service: CancellationClaimsService;

  beforeEach(() => {
    prisma = {
      cancellationFeeClaim: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    stripeCheckout = {
      captureCancellationFee: jest.fn().mockResolvedValue(undefined),
      cancelBookingPayment: jest.fn().mockResolvedValue(undefined),
    };
    notifications = { notifyCustom: jest.fn().mockResolvedValue(undefined) };
    service = new CancellationClaimsService(
      prisma as never,
      stripeCheckout as never,
      notifications as never,
    );
  });

  describe('review', () => {
    it('throws NotFoundException when the claim does not exist', async () => {
      prisma.cancellationFeeClaim.findUnique.mockResolvedValue(null);
      await expect(
        service.review('missing', 'admin_1', { status: 'APPROVED' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(stripeCheckout.captureCancellationFee).not.toHaveBeenCalled();
      expect(stripeCheckout.cancelBookingPayment).not.toHaveBeenCalled();
    });

    it('rejects reviewing a claim that was already reviewed', async () => {
      prisma.cancellationFeeClaim.findUnique.mockResolvedValue(buildClaim({ status: 'APPROVED' }));
      await expect(
        service.review('claim_1', 'admin_1', { status: 'REJECTED' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(stripeCheckout.captureCancellationFee).not.toHaveBeenCalled();
      expect(stripeCheckout.cancelBookingPayment).not.toHaveBeenCalled();
      expect(prisma.cancellationFeeClaim.update).not.toHaveBeenCalled();
    });

    it('captures the claimed fee and marks the claim APPROVED on approval', async () => {
      const claim = buildClaim();
      prisma.cancellationFeeClaim.findUnique.mockResolvedValue(claim);
      prisma.cancellationFeeClaim.update.mockResolvedValue({ ...claim, status: 'APPROVED' });
      const result = await service.review('claim_1', 'admin_1', {
        status: 'APPROVED',
        reviewNote: 'Guest confirmed',
      });
      expect(stripeCheckout.captureCancellationFee).toHaveBeenCalledWith(claim.booking, 10000);
      expect(stripeCheckout.cancelBookingPayment).not.toHaveBeenCalled();
      expect(prisma.cancellationFeeClaim.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'claim_1' },
          data: expect.objectContaining({
            status: 'APPROVED',
            reviewNote: 'Guest confirmed',
            reviewedByUserId: 'admin_1',
          }),
        }),
      );
      expect(result.status).toBe('APPROVED');
    });

    it('releases the full rent hold and marks the claim REJECTED on rejection', async () => {
      const claim = buildClaim();
      prisma.cancellationFeeClaim.findUnique.mockResolvedValue(claim);
      prisma.cancellationFeeClaim.update.mockResolvedValue({ ...claim, status: 'REJECTED' });
      const result = await service.review('claim_1', 'admin_1', { status: 'REJECTED' });
      expect(stripeCheckout.cancelBookingPayment).toHaveBeenCalledWith(claim.booking, false);
      expect(stripeCheckout.captureCancellationFee).not.toHaveBeenCalled();
      expect(result.status).toBe('REJECTED');
    });

    it('notifies both guest and host after a review', async () => {
      const claim = buildClaim();
      prisma.cancellationFeeClaim.findUnique.mockResolvedValue(claim);
      prisma.cancellationFeeClaim.update.mockResolvedValue({ ...claim, status: 'APPROVED' });
      await service.review('claim_1', 'admin_1', { status: 'APPROVED' });
      const notifiedUserIds = notifications.notifyCustom.mock.calls.map((call) => call[0]);
      expect(notifiedUserIds).toEqual(
        expect.arrayContaining([claim.booking.guestId, claim.hostUserId]),
      );
      expect(notifications.notifyCustom).toHaveBeenCalledTimes(2);
    });

    it('does not update the claim when the Stripe capture fails', async () => {
      prisma.cancellationFeeClaim.findUnique.mockResolvedValue(buildClaim());
      stripeCheckout.captureCancellationFee.mockRejectedValue(new Error('card declined'));
      await expect(service.review('claim_1', 'admin_1', { status: 'APPROVED' })).rejects.toThrow(
        'card declined',
      );
      expect(prisma.cancellationFeeClaim.update).not.toHaveBeenCalled();
      expect(notifications.notifyCustom).not.toHaveBeenCalled();
    });

    it('still resolves the review when notifications fail', async () => {
      const claim = buildClaim();
      prisma.cancellationFeeClaim.findUnique.mockResolvedValue(claim);
      prisma.cancellationFeeClaim.update.mockResolvedValue({ ...claim, status: 'REJECTED' });
      notifications.notifyCustom.mockRejectedValue(new Error('notification outage'));
      const result = await service.review('claim_1', 'admin_1', { status: 'REJECTED' });
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('findPendingDetailed', () => {
    it('maps booking, guest, and host details onto the claim view', async () => {
      const claim: MockedClaim = buildClaim();
      prisma.cancellationFeeClaim.findMany.mockResolvedValue([claim]);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'host_user_1',
          profile: { firstName: 'Hasmik', lastName: 'Host' },
          hostProfile: { hostType: 'INDIVIDUAL', companyName: null },
        },
      ]);
      const views = await service.findPendingDetailed();
      expect(views).toHaveLength(1);
      expect(views[0]).toMatchObject({
        id: 'claim_1',
        bookingId: 'booking_1',
        amount: 10000,
        currency: 'AMD',
        rentAmount: 100000,
        propertyTitle: 'Test flat',
        guestName: 'Anna Guest',
        hostName: 'Hasmik Host',
        status: 'PENDING',
      });
      expect(views[0]?.checkIn).toBe('2026-09-01T00:00:00.000Z');
    });

    it('prefers the company name for company hosts and falls back when profiles are missing', async () => {
      const claim = buildClaim({
        booking: { ...buildClaim().booking, guest: { profile: null } },
      });
      prisma.cancellationFeeClaim.findMany.mockResolvedValue([claim]);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'host_user_1',
          profile: { firstName: 'Hasmik', lastName: 'Host' },
          hostProfile: { hostType: 'COMPANY', companyName: 'RentCo LLC' },
        },
      ]);
      const views = await service.findPendingDetailed();
      expect(views[0]?.hostName).toBe('RentCo LLC');
      expect(views[0]?.guestName).toBe('Guest');
    });
  });
});
