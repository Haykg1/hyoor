import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/database/client';
import type { Review, ReviewTarget } from '@repo/database/client';
import type { PaginatedResponse } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

export interface ReviewAuthorProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface ReviewView {
  id: string;
  bookingId: string;
  authorId: string;
  subjectId: string;
  target: ReviewTarget;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  propertyId: string | null;
  createdAt: Date;
  author: ReviewAuthorProfile;
}

type BookingWithRelations = {
  id: string;
  status: string;
  guestId: string;
  propertyId: string;
  property: {
    id: string;
    host: { id: string; userId: string };
  };
};

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(authorId: string, dto: CreateReviewDto): Promise<ReviewView> {
    const booking = await this.getBookingOrThrow(dto.bookingId);
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Reviews are only allowed for completed bookings');
    }
    const reviewData = this.resolveReviewParties(booking, authorId, dto.target);
    if (dto.target === 'PROPERTY' && reviewData.propertyId) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const recentReview = await this.prisma.review.findFirst({
        where: {
          authorId,
          propertyId: reviewData.propertyId,
          target: 'PROPERTY',
          createdAt: { gte: oneYearAgo },
        },
      });
      if (recentReview) {
        throw new ConflictException('You have already reviewed this property in the last year');
      }
    }
    try {
      const review = await this.prisma.review.create({
        data: {
          bookingId: dto.bookingId,
          authorId,
          subjectId: reviewData.subjectId,
          target: dto.target,
          rating: dto.rating,
          comment: dto.comment,
          propertyId: reviewData.propertyId,
        },
      });
      await this.notificationsService.notify(
        reviewData.subjectId,
        'NEW_REVIEW',
        review.id,
        'review',
      );
      return this.toReviewView(review);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already submitted this review');
      }
      throw error;
    }
  }

  async findByProperty(
    propertyId: string,
    dto: QueryReviewsDto,
  ): Promise<PaginatedResponse<ReviewView>> {
    await this.assertPropertyExists(propertyId);
    return this.findPublishedReviews({ propertyId, target: 'PROPERTY', isPublished: true }, dto);
  }

  async findByUser(userId: string, dto: QueryReviewsDto): Promise<PaginatedResponse<ReviewView>> {
    return this.findPublishedReviews(
      { subjectId: userId, target: 'GUEST', isPublished: true },
      dto,
    );
  }

  async findByHost(hostId: string, dto: QueryReviewsDto): Promise<PaginatedResponse<ReviewView>> {
    const hostProfile = await this.prisma.hostProfile.findUnique({ where: { id: hostId } });
    if (!hostProfile) {
      throw new NotFoundException('Host profile not found');
    }
    return this.findPublishedReviews(
      { authorId: hostProfile.userId, target: 'GUEST', isPublished: true },
      dto,
    );
  }

  async unpublish(id: string): Promise<ReviewView> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const updated = await this.prisma.review.update({
      where: { id },
      data: { isPublished: false },
    });
    return this.toReviewView(updated);
  }

  private resolveReviewParties(
    booking: BookingWithRelations,
    authorId: string,
    target: ReviewTarget,
  ): { subjectId: string; propertyId: string | null } {
    const hostUserId = booking.property.host.userId;
    if (target === 'PROPERTY') {
      if (authorId !== booking.guestId) {
        throw new ForbiddenException('Only the guest can review the property');
      }
      return {
        subjectId: hostUserId,
        propertyId: booking.property.id,
      };
    }
    if (authorId !== hostUserId) {
      throw new ForbiddenException('Only the host can review the guest');
    }
    return {
      subjectId: booking.guestId,
      propertyId: null,
    };
  }

  private async getBookingOrThrow(bookingId: string): Promise<BookingWithRelations> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { include: { host: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private async assertPropertyExists(propertyId: string): Promise<void> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
  }

  private async findPublishedReviews(
    where: Prisma.ReviewWhereInput,
    dto: QueryReviewsDto,
  ): Promise<PaginatedResponse<ReviewView>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const effectiveWhere: Prisma.ReviewWhereInput =
      dto.rating != null ? { ...where, rating: dto.rating } : where;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: effectiveWhere,
        orderBy: { createdAt: dto.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: effectiveWhere }),
    ]);
    const data = await Promise.all(reviews.map((review) => this.toReviewView(review)));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private async toReviewView(review: Review): Promise<ReviewView> {
    const author = await this.prisma.user.findUnique({
      where: { id: review.authorId },
      include: { profile: true },
    });
    if (!author) {
      throw new NotFoundException('Review author not found');
    }
    return {
      id: review.id,
      bookingId: review.bookingId,
      authorId: review.authorId,
      subjectId: review.subjectId,
      target: review.target,
      rating: review.rating,
      comment: review.comment,
      isPublished: review.isPublished,
      propertyId: review.propertyId,
      createdAt: review.createdAt,
      author: {
        id: author.id,
        firstName: author.profile?.firstName ?? null,
        lastName: author.profile?.lastName ?? null,
        avatarUrl: author.profile?.avatarKey ?? null,
      },
    };
  }
}
