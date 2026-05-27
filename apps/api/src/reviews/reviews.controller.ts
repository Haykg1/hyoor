import {
  Body,
  Controller,
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
import type { PaginatedResponse } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ReviewsService, type ReviewView } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
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
}
