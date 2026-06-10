import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CompareSharePair, CreateCompareShareResult } from '@repo/shared';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { WRITE_THROTTLE } from '../common/throttle/throttle.constants';

import { CompareShareService } from './compare-share.service';
import { CreateCompareShareDto } from './dto/create-compare-share.dto';

@ApiTags('compare-share')
@Controller('compare-share')
export class CompareShareController {
  constructor(private readonly compareShareService: CompareShareService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Create a short-lived shareable token for a property comparison' })
  @ApiCreatedResponse({ description: 'Share token valid for 24 hours' })
  @ApiStandardErrors({ auth: false, throttle: true })
  create(@Body() dto: CreateCompareShareDto): Promise<CreateCompareShareResult> {
    return this.compareShareService.create(dto);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Resolve a compare share token to its property IDs' })
  @ApiOkResponse({ description: 'Property IDs for the shared comparison' })
  @ApiStandardErrors({ auth: false, notFound: true })
  resolve(@Param('token') token: string): Promise<CompareSharePair> {
    return this.compareShareService.resolve(token);
  }
}
