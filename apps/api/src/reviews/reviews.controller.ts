import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { PaginatedResponse, ReviewPhotoView } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { WRITE_THROTTLE } from '../common/throttle/throttle.constants';

import { ConfirmReviewPhotoUploadDto } from './dto/confirm-review-photo-upload.dto';
import { CreateReviewPhotoPresignedUrlDto } from './dto/create-review-photo-presigned-url.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ReviewsService, type ReviewView } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
@Throttle(WRITE_THROTTLE)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review after a completed stay' })
  @ApiCreatedResponse({ description: 'Review created (guest→property or host→guest)' })
  @ApiStandardErrors({ conflict: true })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto): Promise<ReviewView> {
    return this.reviewsService.create(user.userId, dto);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'List published reviews for a property' })
  @ApiOkResponse({ description: 'Paginated property reviews' })
  @ApiStandardErrors({ auth: false })
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() dto: QueryReviewsDto,
  ): Promise<PaginatedResponse<ReviewView>> {
    return this.reviewsService.findByProperty(propertyId, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List published reviews about a guest user' })
  @ApiOkResponse({ description: 'Paginated guest reviews' })
  @ApiStandardErrors({ auth: false })
  findByUser(
    @Param('userId') userId: string,
    @Query() dto: QueryReviewsDto,
  ): Promise<PaginatedResponse<ReviewView>> {
    return this.reviewsService.findByUser(userId, dto);
  }

  @Get('host/:hostId')
  @ApiOperation({ summary: 'List published reviews for all properties of a host' })
  @ApiOkResponse({ description: 'Paginated host property reviews' })
  @ApiStandardErrors({ auth: false })
  findByHost(
    @Param('hostId') hostId: string,
    @Query() dto: QueryReviewsDto,
  ): Promise<PaginatedResponse<ReviewView>> {
    return this.reviewsService.findByHost(hostId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a review (admin/staff only)' })
  @ApiOkResponse({ description: 'Review soft-deleted (isPublished=false)' })
  @ApiStandardErrors({ notFound: true })
  unpublish(@Param('id') id: string): Promise<ReviewView> {
    return this.reviewsService.unpublish(id);
  }

  @Post(':id/photos/presigned-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned S3 URL to upload a review photo' })
  @ApiCreatedResponse({ description: '{ uploadUrl, key }' })
  @ApiStandardErrors({ notFound: true })
  createPhotoUploadUrl(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewPhotoPresignedUrlDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    return this.reviewsService.createPhotoUploadUrl(id, user.userId, dto.mimeType);
  }

  @Post(':id/photos/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a review photo upload and create DB record' })
  @ApiCreatedResponse({ description: 'ReviewPhotoView' })
  @ApiStandardErrors({ notFound: true })
  confirmPhotoUpload(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ConfirmReviewPhotoUploadDto,
  ): Promise<ReviewPhotoView> {
    return this.reviewsService.confirmPhotoUpload(id, user.userId, dto.key);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review photo' })
  @ApiStandardErrors({ notFound: true })
  deletePhoto(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ): Promise<void> {
    return this.reviewsService.deletePhoto(id, photoId, user.userId);
  }
}
