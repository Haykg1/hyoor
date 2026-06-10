import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService, type PublicUserProfile, type UserMeResponse } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ description: 'Current user with profile' })
  @ApiStandardErrors()
  getMe(@CurrentUser() user: RequestUser): Promise<UserMeResponse> {
    return this.usersService.getMe(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ description: 'Updated user profile' })
  @ApiStandardErrors()
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserMeResponse> {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile avatar (max 5MB, JPEG/PNG/WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image (JPEG, PNG, or WebP, max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Avatar uploaded; returns S3 key and presigned URL' })
  @ApiStandardErrors()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatarKey: string; avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    return this.usersService.uploadAvatar(user.userId, file.buffer, file.mimetype);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove profile avatar' })
  @ApiOkResponse({ description: 'Avatar deleted' })
  @ApiStandardErrors()
  deleteAvatar(@CurrentUser() user: RequestUser): Promise<{ success: true }> {
    return this.usersService.deleteAvatar(user.userId);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change account password' })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiStandardErrors()
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile by ID' })
  @ApiOkResponse({ description: 'Public profile (no sensitive fields)' })
  @ApiStandardErrors({ auth: false, notFound: true })
  getPublicProfile(@Param('id') id: string): Promise<PublicUserProfile> {
    return this.usersService.getPublicProfile(id);
  }
}
