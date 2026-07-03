import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { PrismaClient } from '@repo/database';

import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../mail/mailer.service';
import {
  buildGuestInstructionsEmail,
  type GuestInstructionsEmailData,
} from '../mail/templates/guest-instructions.template';

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildFormattedAddress(property: {
  formattedAddress: string | null;
  addressLine: string | null;
  street: string | null;
  buildingNumber: string | null;
  city: string;
  apartmentNumber: string | null;
}): string {
  if (property.formattedAddress?.trim()) return property.formattedAddress.trim();
  const parts = [
    property.street,
    property.buildingNumber,
    property.apartmentNumber ? `apt. ${property.apartmentNumber}` : null,
    property.city,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (property.addressLine?.trim()) return property.addressLine.trim();
  return property.city;
}

function buildMapsUrl(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function hasGuestInstructions(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const stripped = value.replace(/<[^>]+>/g, '').trim();
  return stripped.length > 0;
}

@Injectable()
export class GuestInstructionsCronService {
  private readonly logger = new Logger(GuestInstructionsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Cron('0 5 * * *')
  async sendGuestInstructionsForToday(): Promise<void> {
    const today = startOfTodayLocal();
    const bookings = await this.db.booking.findMany({
      where: {
        checkIn: today,
        status: 'CONFIRMED',
        guestInstructionsSentAt: null,
        property: {
          guestInstructions: { not: null },
        },
      },
      include: {
        guest: { include: { profile: true } },
        property: {
          include: {
            host: {
              include: {
                user: { include: { profile: true } },
              },
            },
          },
        },
      },
    });
    let sentCount = 0;
    for (const booking of bookings) {
      const instructions = booking.property.guestInstructions;
      if (!hasGuestInstructions(instructions)) continue;
      try {
        const emailData = this.buildEmailData(booking, instructions!);
        const email = buildGuestInstructionsEmail(emailData);
        await this.mailer.send({
          to: booking.guest.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
        await this.db.booking.update({
          where: { id: booking.id },
          data: { guestInstructionsSentAt: new Date() },
        });
        sentCount += 1;
      } catch (error) {
        this.logger.error(
          `Failed to send guest instructions for booking ${booking.id}: ${String(error)}`,
        );
      }
    }
    if (sentCount > 0) {
      this.logger.log(
        `Sent ${sentCount} guest instruction email(s) for check-in date ${today.toISOString()}`,
      );
    }
  }

  private buildEmailData(
    booking: {
      checkIn: Date;
      checkOut: Date;
      guestCount: number;
      guest: {
        profile: { firstName: string; lastName: string; phone: string | null } | null;
      };
      property: {
        title: string;
        city: string;
        region: string | null;
        checkInTime: string | null;
        checkOutTime: string | null;
        smokingAllowed: boolean;
        petsAllowed: boolean;
        partiesAllowed: boolean;
        quietHoursStart: string | null;
        quietHoursEnd: string | null;
        additionalRules: string | null;
        formattedAddress: string | null;
        addressLine: string | null;
        street: string | null;
        buildingNumber: string | null;
        apartmentNumber: string | null;
        latitude: { toString(): string } | null;
        longitude: { toString(): string } | null;
        host: {
          payoutEmail: string | null;
          user: {
            email: string;
            profile: { firstName: string; lastName: string; phone: string | null } | null;
          };
        };
      };
    },
    guestInstructionsHtml: string,
  ): GuestInstructionsEmailData {
    const hostProfile = booking.property.host.user.profile;
    const hostName = hostProfile
      ? `${hostProfile.firstName} ${hostProfile.lastName}`.trim()
      : 'Your host';
    const guestProfile = booking.guest.profile;
    const guestFirstName = guestProfile?.firstName?.trim() || 'there';
    const latitude =
      booking.property.latitude !== null ? Number(booking.property.latitude.toString()) : null;
    const longitude =
      booking.property.longitude !== null ? Number(booking.property.longitude.toString()) : null;
    return {
      propertyTitle: booking.property.title,
      propertyCity: booking.property.city,
      propertyRegion: booking.property.region,
      checkInDate: formatDisplayDate(booking.checkIn),
      checkOutDate: formatDisplayDate(booking.checkOut),
      checkInTime: booking.property.checkInTime,
      checkOutTime: booking.property.checkOutTime,
      guestCount: booking.guestCount,
      guestFirstName,
      formattedAddress: buildFormattedAddress(booking.property),
      mapsUrl: buildMapsUrl(latitude, longitude),
      guestInstructionsHtml,
      smokingAllowed: booking.property.smokingAllowed,
      petsAllowed: booking.property.petsAllowed,
      partiesAllowed: booking.property.partiesAllowed,
      quietHoursStart: booking.property.quietHoursStart,
      quietHoursEnd: booking.property.quietHoursEnd,
      additionalRules: booking.property.additionalRules,
      hostName,
      hostPhone: hostProfile?.phone ?? null,
      hostEmail: booking.property.host.payoutEmail ?? booking.property.host.user.email,
      frontendUrl: this.config.get('frontend.url', { infer: true }),
    };
  }

  private get db(): PrismaClient {
    return this.prisma as unknown as PrismaClient;
  }
}
