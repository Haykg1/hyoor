import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { Throttle } from '@nestjs/throttler';
import type {
  BulkImportConfirmResponse,
  BulkImportJobResponse,
  BulkImportPreviewResponse,
} from '@repo/shared';

import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { WRITE_THROTTLE } from '../../common/throttle/throttle.constants';
import { BulkImportConfirmDto } from '../dto/bulk-import-confirm.dto';

import { PropertyBulkImportService } from './property-bulk-import.service';

@ApiTags('properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HOST')
@Controller('properties/bulk-import')
export class PropertyBulkImportController {
  constructor(private readonly bulkImport: PropertyBulkImportService) {}

  @Post('analyze')
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Analyze a CSV/XLSX file and return a preview of property rows' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Preview of normalized rows' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async analyze(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BulkImportPreviewResponse> {
    if (!file) throw new BadRequestException('No file provided');
    return this.bulkImport.analyze(user.userId, file.buffer, file.mimetype, file.originalname);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Confirm bulk import — starts background job, returns jobId' })
  async confirm(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkImportConfirmDto,
  ): Promise<BulkImportConfirmResponse> {
    return this.bulkImport.confirm(user.userId, dto.previewId, dto.locale);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Poll status of a bulk import job' })
  async getJob(
    @CurrentUser() user: RequestUser,
    @Param('jobId') jobId: string,
  ): Promise<BulkImportJobResponse> {
    return this.bulkImport.getJob(jobId, user.userId);
  }
}
