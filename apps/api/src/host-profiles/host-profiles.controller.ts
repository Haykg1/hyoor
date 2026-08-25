import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import {
  HostProfilesService,
  type HostProfileWithUser,
  type PublicHostProfile,
} from './host-profiles.service';

@ApiTags('host-profiles')
@Controller('host-profiles')
export class HostProfilesController {
  constructor(private readonly hostProfilesService: HostProfilesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a host profile for the current user' })
  @ApiCreatedResponse({ description: 'Host profile created; user role upgraded to HOST' })
  @ApiStandardErrors({ conflict: true })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateHostProfileDto,
  ): Promise<HostProfileWithUser> {
    return this.hostProfilesService.create(user.userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated host profile' })
  @ApiOkResponse({ description: 'Host profile with linked user' })
  @ApiStandardErrors({ notFound: true })
  getMe(@CurrentUser() user: RequestUser): Promise<HostProfileWithUser> {
    return this.hostProfilesService.findByUserId(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated host profile' })
  @ApiOkResponse({ description: 'Updated host profile' })
  @ApiStandardErrors({ notFound: true })
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateHostProfileDto,
  ): Promise<HostProfileWithUser> {
    return this.hostProfilesService.update(user.userId, dto);
  }

  @Post('me/logo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload host company logo (max 5MB, JPEG/PNG/WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Company logo (JPEG, PNG, or WebP, max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Logo uploaded; returns S3 key and presigned URL' })
  @ApiStandardErrors({ notFound: true })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ logoKey: string; logoUrl: string }> {
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }
    return this.hostProfilesService.uploadLogo(user.userId, file.buffer, file.mimetype);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a host profile (admin/staff only)' })
  @ApiOkResponse({ description: 'Host profile marked as verified' })
  @ApiStandardErrors({ notFound: true })
  verify(@Param('id') id: string): Promise<HostProfileWithUser> {
    return this.hostProfilesService.verify(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public host profile by ID' })
  @ApiOkResponse({ description: 'Public host profile with stats' })
  @ApiStandardErrors({ auth: false, notFound: true })
  getPublicProfile(@Param('id') id: string): Promise<PublicHostProfile> {
    return this.hostProfilesService.getPublicProfile(id);
  }
}
