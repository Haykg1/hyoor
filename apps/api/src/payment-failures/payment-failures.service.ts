import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentFailureCategory, Prisma } from '@repo/database/client';
import type { AdminPaymentFailure, PaginatedResponse } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';
import Stripe from 'stripe';

import { PrismaService } from '../database/prisma.service';

export interface ListPaymentFailuresParams {
  bookingId?: string;
  propertyId?: string;
  hostId?: string;
  guestId?: string;
  category?: PaymentFailureCategory;
  resolved?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PaymentFailuresService {
  constructor(private readonly prisma: PrismaService) {}

  async record(bookingId: string, category: PaymentFailureCategory, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const stripeErrorCode =
      error instanceof Stripe.errors.StripeError ? (error.code ?? null) : null;
    await this.prisma.paymentFailure.create({
      data: { bookingId, category, message, stripeErrorCode },
    });
  }

  async list(params: ListPaymentFailuresParams): Promise<PaginatedResponse<AdminPaymentFailure>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const search = params.search?.trim();
    const where: Prisma.PaymentFailureWhereInput = {
      ...(params.bookingId ? { bookingId: params.bookingId } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.resolved !== undefined ? { resolved: params.resolved } : {}),
      booking: {
        ...(params.propertyId ? { propertyId: params.propertyId } : {}),
        ...(params.guestId ? { guestId: params.guestId } : {}),
        ...(params.hostId ? { property: { hostId: params.hostId } } : {}),
        ...(search
          ? {
              OR: [
                { property: { title: { contains: search, mode: 'insensitive' } } },
                { guest: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
                { guest: { profile: { lastName: { contains: search, mode: 'insensitive' } } } },
                {
                  property: {
                    host: {
                      user: { profile: { firstName: { contains: search, mode: 'insensitive' } } },
                    },
                  },
                },
                {
                  property: {
                    host: {
                      user: { profile: { lastName: { contains: search, mode: 'insensitive' } } },
                    },
                  },
                },
                { property: { host: { companyName: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
    };
    const [rows, total] = await Promise.all([
      this.prisma.paymentFailure.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          booking: {
            include: {
              property: {
                include: { host: { include: { user: { include: { profile: true } } } } },
              },
              guest: { include: { profile: true } },
            },
          },
        },
      }),
      this.prisma.paymentFailure.count({ where }),
    ]);
    return {
      data: rows.map((row) => {
        const { booking } = row;
        const { property, guest } = booking;
        const { host } = property;
        const hostName =
          host.hostType === 'COMPANY' && host.companyName
            ? host.companyName
            : `${host.user.profile?.firstName ?? 'Host'} ${host.user.profile?.lastName ?? ''}`.trim();
        const guestName =
          `${guest.profile?.firstName ?? 'Guest'} ${guest.profile?.lastName ?? ''}`.trim();
        return {
          id: row.id,
          bookingId: row.bookingId,
          propertyId: property.id,
          propertyTitle: property.title,
          guestId: guest.id,
          guestName,
          hostProfileId: host.id,
          hostName,
          category: row.category,
          message: row.message,
          stripeErrorCode: row.stripeErrorCode,
          resolved: row.resolved,
          resolvedAt: row.resolvedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async resolve(id: string, adminUserId: string): Promise<void> {
    const failure = await this.prisma.paymentFailure.findUnique({ where: { id } });
    if (!failure) {
      throw new NotFoundException('Payment failure not found');
    }
    await this.prisma.paymentFailure.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date(), resolvedByUserId: adminUserId },
    });
  }

  async resolveMany(ids: string[], adminUserId: string): Promise<{ resolvedCount: number }> {
    const uniqueIds = [...new Set(ids)];
    const existing = await this.prisma.paymentFailure.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (existing.length !== uniqueIds.length) {
      throw new NotFoundException('One or more payment failures not found');
    }
    const result = await this.prisma.paymentFailure.updateMany({
      where: { id: { in: uniqueIds }, resolved: false },
      data: { resolved: true, resolvedAt: new Date(), resolvedByUserId: adminUserId },
    });
    return { resolvedCount: result.count };
  }
}
