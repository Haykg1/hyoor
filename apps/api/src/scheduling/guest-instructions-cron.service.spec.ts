import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

import { GuestInstructionsCronService } from './guest-instructions-cron.service';

describe('GuestInstructionsCronService', () => {
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const config = {
    get: jest.fn().mockReturnValue('https://rentstar.am'),
  } as unknown as ConfigService<AppConfig, true>;
  const prisma = {
    booking: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  let service: GuestInstructionsCronService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GuestInstructionsCronService(prisma as never, mailer as never, config);
  });

  it('sends email and marks booking when instructions exist', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        checkIn: today,
        checkOut: today,
        guestCount: 2,
        guest: {
          email: 'guest@rentstar.am',
          profile: { firstName: 'Anna', lastName: 'Guest', phone: null },
        },
        property: {
          title: 'Test Property',
          city: 'Yerevan',
          region: null,
          checkInTime: '14:00',
          checkOutTime: '11:00',
          smokingAllowed: false,
          petsAllowed: false,
          partiesAllowed: false,
          quietHoursStart: null,
          quietHoursEnd: null,
          additionalRules: null,
          formattedAddress: 'Main Street 1',
          addressLine: null,
          street: null,
          buildingNumber: null,
          apartmentNumber: null,
          latitude: null,
          longitude: null,
          guestInstructions: '<p>Code is 1234</p>',
          host: {
            payoutEmail: null,
            user: {
              email: 'host@rentstar.am',
              profile: { firstName: 'Host', lastName: 'User', phone: '+37491111001' },
            },
          },
        },
      },
    ]);
    await service.sendGuestInstructionsForToday();
    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'guest@rentstar.am',
        subject: expect.stringContaining('Test Property'),
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { guestInstructionsSentAt: expect.any(Date) },
    });
  });

  it('skips bookings with empty instructions after query', async () => {
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-2',
        checkIn: new Date(),
        checkOut: new Date(),
        guestCount: 1,
        guest: { email: 'guest@rentstar.am', profile: null },
        property: {
          title: 'Empty',
          city: 'Yerevan',
          region: null,
          checkInTime: null,
          checkOutTime: null,
          smokingAllowed: false,
          petsAllowed: false,
          partiesAllowed: false,
          quietHoursStart: null,
          quietHoursEnd: null,
          additionalRules: null,
          formattedAddress: 'Addr',
          addressLine: null,
          street: null,
          buildingNumber: null,
          apartmentNumber: null,
          latitude: null,
          longitude: null,
          guestInstructions: '<p></p>',
          host: {
            payoutEmail: null,
            user: { email: 'host@rentstar.am', profile: null },
          },
        },
      },
    ]);
    await service.sendGuestInstructionsForToday();
    expect(mailer.send).not.toHaveBeenCalled();
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });
});
