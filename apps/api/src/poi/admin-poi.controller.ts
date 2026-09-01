import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AdminPoi,
  PaginatedResponse,
  PoiPhotoView,
  PresignedPhotoUrlResponse,
} from '@repo/shared';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { CreatePresignedPhotoUrlDto } from '../properties/dto/create-presigned-photo-url.dto';

import { AdminPoiService } from './admin-poi.service';
import {
  ImportPoiPhotoDto,
  SetPoiPhotoStatusDto,
  SuggestPoiPhotosDto,
} from './dto/admin-poi-photo-actions.dto';
import { ConfirmAdminPoiPhotoDto } from './dto/confirm-admin-poi-photo.dto';
import { CreateAdminPoiDto } from './dto/create-admin-poi.dto';
import { QueryAdminPoisDto } from './dto/query-admin-pois.dto';
import { UpdateAdminPoiDto } from './dto/update-admin-poi.dto';

@ApiTags('admin')
@Controller('admin/pois')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@ApiBearerAuth()
export class AdminPoiController {
  constructor(private readonly adminPoiService: AdminPoiService) {}

  @Get()
  @ApiOperation({ summary: 'List destination POIs for admin CRUD' })
  @ApiOkResponse({ description: 'Paginated POI list' })
  @ApiStandardErrors()
  list(@Query() dto: QueryAdminPoisDto): Promise<PaginatedResponse<AdminPoi>> {
    return this.adminPoiService.list(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a POI by id' })
  @ApiOkResponse({ description: 'POI detail' })
  @ApiStandardErrors({ notFound: true })
  getById(@Param('id') id: string): Promise<AdminPoi> {
    return this.adminPoiService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a destination POI' })
  @ApiOkResponse({ description: 'Created POI' })
  @ApiStandardErrors({ conflict: true })
  create(@Body() dto: CreateAdminPoiDto): Promise<AdminPoi> {
    return this.adminPoiService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a destination POI' })
  @ApiOkResponse({ description: 'Updated POI' })
  @ApiStandardErrors({ notFound: true })
  update(@Param('id') id: string, @Body() dto: UpdateAdminPoiDto): Promise<AdminPoi> {
    return this.adminPoiService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a destination POI' })
  @ApiOkResponse({ description: 'POI deleted' })
  @ApiStandardErrors({ notFound: true })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.adminPoiService.remove(id);
    return { message: 'POI deleted' };
  }

  @Post(':id/photos/presigned-url')
  @ApiOperation({ summary: 'Get a presigned S3 URL to upload a POI photo' })
  @ApiOkResponse({ description: 'Presigned upload URL and object key' })
  @ApiStandardErrors({ notFound: true })
  createPresignedUrl(
    @Param('id') id: string,
    @Body() dto: CreatePresignedPhotoUrlDto,
  ): Promise<PresignedPhotoUrlResponse> {
    return this.adminPoiService.createPresignedPhotoUrl(id, dto.mimeType);
  }

  @Post(':id/photos/confirm')
  @ApiOperation({ summary: 'Confirm a POI photo upload' })
  @ApiOkResponse({ description: 'Photo record with presigned read URL' })
  @ApiStandardErrors({ notFound: true })
  confirmPhoto(
    @Param('id') id: string,
    @Body() dto: ConfirmAdminPoiPhotoDto,
  ): Promise<PoiPhotoView> {
    return this.adminPoiService.confirmPhoto(id, dto.key, dto.sortOrder);
  }

  @Patch(':id/photos/:photoId')
  @ApiOperation({ summary: 'Approve or reject a POI photo' })
  @ApiOkResponse({ description: 'Updated photo record' })
  @ApiStandardErrors({ notFound: true })
  setPhotoStatus(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() dto: SetPoiPhotoStatusDto,
  ): Promise<PoiPhotoView> {
    return this.adminPoiService.setPhotoStatus(id, photoId, dto.status);
  }

  @Post(':id/photos/suggest')
  @ApiOperation({ summary: 'Search the web for candidate photo URLs for a POI' })
  @ApiOkResponse({ description: 'Candidate image URLs for a human to pick' })
  @ApiStandardErrors({ notFound: true })
  suggestPhotos(
    @Param('id') id: string,
    @Body() dto: SuggestPoiPhotosDto,
  ): Promise<{ urls: string[]; configured: boolean }> {
    return this.adminPoiService.suggestPhotos(id, dto.query);
  }

  @Post(':id/photos/import')
  @ApiOperation({ summary: 'Download an image URL into a POI as a pending-review photo' })
  @ApiOkResponse({ description: 'Photo record (PENDING_REVIEW)' })
  @ApiStandardErrors({ notFound: true })
  importPhoto(@Param('id') id: string, @Body() dto: ImportPoiPhotoDto): Promise<PoiPhotoView> {
    return this.adminPoiService.importPhotoFromUrl(id, dto);
  }

  @Delete(':id/photos/:photoId')
  @ApiOperation({ summary: 'Delete a POI photo' })
  @ApiOkResponse({ description: 'Photo deleted' })
  @ApiStandardErrors({ notFound: true })
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ): Promise<{ message: string }> {
    await this.adminPoiService.deletePhoto(id, photoId);
    return { message: 'Photo deleted' };
  }
}
