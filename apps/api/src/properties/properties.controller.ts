import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Property, PropertyAmenity, PropertyStatus } from '@repo/database/client';
import type { PaginatedResponse, PropertySummary } from '@repo/shared';
import type { HostListingsResponse } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryMyPropertiesDto } from './dto/query-my-properties.dto';
import { ReplaceAmenitiesDto } from './dto/replace-amenities.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { UpdatePropertyStatusDto } from './dto/update-property-status.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import {
  PropertiesService,
  type PropertyDetail,
  type PropertyPhotoView,
} from './properties.service';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new property listing (host only)' })
  @ApiCreatedResponse({ description: 'Property created in DRAFT status' })
  @ApiStandardErrors()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePropertyDto): Promise<Property> {
    return this.propertiesService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list active properties' })
  @ApiOkResponse({ description: 'Paginated property search results' })
  @ApiStandardErrors({ auth: false })
  search(@Query() dto: SearchPropertiesDto): Promise<PaginatedResponse<PropertySummary>> {
    return this.propertiesService.search(dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List properties owned by the authenticated host (paginated)' })
  @ApiOkResponse({ description: 'Paginated host listings with dashboard stats' })
  @ApiStandardErrors()
  findMy(
    @CurrentUser() user: RequestUser,
    @Query() dto: QueryMyPropertiesDto,
  ): Promise<HostListingsResponse> {
    return this.propertiesService.findMyListings(user.userId, dto);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get property detail by ID' })
  @ApiOkResponse({ description: 'Full property detail with photos and amenities' })
  @ApiStandardErrors({ auth: false, notFound: true })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser | null,
  ): Promise<PropertyDetail> {
    return this.propertiesService.findById(id, user?.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a property listing (owner host only)' })
  @ApiOkResponse({ description: 'Updated property' })
  @ApiStandardErrors({ notFound: true })
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a property (owner host only)' })
  @ApiOkResponse({ description: 'Property deleted' })
  @ApiStandardErrors({ notFound: true })
  softDelete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: true }> {
    return this.propertiesService.softDelete(id, user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change property status (admin/staff only)' })
  @ApiOkResponse({ description: 'Property status updated' })
  @ApiStandardErrors({ notFound: true })
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePropertyStatusDto): Promise<Property> {
    return this.propertiesService.updateStatus(id, dto.status as PropertyStatus);
  }

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a property photo (max 5MB, JPEG/PNG/WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Property photo (JPEG, PNG, or WebP, max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Photo uploaded with presigned URL' })
  @ApiStandardErrors({ notFound: true })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadPhoto(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PropertyPhotoView> {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }
    return this.propertiesService.uploadPhoto(id, user.userId, file.buffer, file.mimetype);
  }

  @Patch(':id/photos/:photoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update photo metadata (caption, sort order, cover flag)' })
  @ApiOkResponse({ description: 'Updated photo with presigned URL' })
  @ApiStandardErrors({ notFound: true })
  updatePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePhotoDto,
  ): Promise<PropertyPhotoView> {
    return this.propertiesService.updatePhoto(id, photoId, user.userId, dto);
  }

  @Delete(':id/photos/:photoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a property photo' })
  @ApiOkResponse({ description: 'Photo deleted' })
  @ApiStandardErrors({ notFound: true })
  deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: true }> {
    return this.propertiesService.deletePhoto(id, photoId, user.userId);
  }

  @Put(':id/amenities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace all amenities for a property' })
  @ApiOkResponse({ description: 'Updated amenity list' })
  @ApiStandardErrors({ notFound: true })
  replaceAmenities(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReplaceAmenitiesDto,
  ): Promise<PropertyAmenity[]> {
    return this.propertiesService.replaceAmenities(id, user.userId, dto.amenities);
  }
}
