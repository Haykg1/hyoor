import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/database/client';
import type { Review, ReviewTarget } from '@repo/database/client';
import type { PaginatedResponse, ReviewPhotoView } from '@repo/shared';
import type { PhotoMimeType } from '@repo/shared';
import { DEFAULT_PAGE_SIZE, S3_PRESIGNED_URL_EXPIRES } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

const MAX_REVIEW_PHOTOS = 5;
const ALLOWED_REVIEW_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
  photos: ReviewPhotoView[];
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
    private readonly storage: StorageService,
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

  async createPhotoUploadUrl(
    reviewId: string,
    userId: string,
    mimeType: PhotoMimeType,
  ): Promise<{ uploadUrl: string; key: string }> {
    if (!ALLOWED_REVIEW_PHOTO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, or WebP image');
    }
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { _count: { select: { photos: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.authorId !== userId) throw new ForbiddenException('Not your review');
    if (review._count.photos >= MAX_REVIEW_PHOTOS) {
      throw new BadRequestException(`Maximum ${MAX_REVIEW_PHOTOS} photos per review`);
    }
    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const key = `reviews/${reviewId}/${randomUUID() as string}.${ext}`;
    const uploadUrl = await this.storage.getPresignedUploadUrl(
      key,
      mimeType,
      S3_PRESIGNED_URL_EXPIRES,
    );
    return { uploadUrl, key };
  }

  async confirmPhotoUpload(
    reviewId: string,
    userId: string,
    key: string,
  ): Promise<ReviewPhotoView> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.authorId !== userId) throw new ForbiddenException('Not your review');
    if (!key.startsWith(`reviews/${reviewId}/`)) {
      throw new BadRequestException('Invalid photo key');
    }
    const photo = await this.prisma.reviewPhoto.create({ data: { reviewId, key } });
    const url = await this.storage.getPresignedUrl(photo.key, S3_PRESIGNED_URL_EXPIRES);
    return { id: photo.id, reviewId: photo.reviewId, url };
  }

  async deletePhoto(reviewId: string, photoId: string, userId: string): Promise<void> {
    const photo = await this.prisma.reviewPhoto.findUnique({
      where: { id: photoId },
      include: { review: true },
    });
    if (!photo || photo.reviewId !== reviewId) throw new NotFoundException('Photo not found');
    if (photo.review.authorId !== userId) throw new ForbiddenException('Not your review');
    await this.storage.deleteFile(photo.key);
    await this.prisma.reviewPhoto.delete({ where: { id: photoId } });
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
        include: { photos: true },
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

  private async toReviewView(
    review: Review & { photos?: { id: string; reviewId: string; key: string }[] },
  ): Promise<ReviewView> {
    const author = await this.prisma.user.findUnique({
      where: { id: review.authorId },
      include: { profile: true },
    });
    if (!author) {
      throw new NotFoundException('Review author not found');
    }
    const photos: ReviewPhotoView[] = await Promise.all(
      (review.photos ?? []).map(async (p) => ({
        id: p.id,
        reviewId: p.reviewId,
        url: await this.storage.getPresignedUrl(p.key, S3_PRESIGNED_URL_EXPIRES),
      })),
    );
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
      photos,
    };
  }
}
