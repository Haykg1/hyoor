import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import type { CreatePromotionResult, PaginatedResponse, PromotionSummary } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { WRITE_THROTTLE } from '../common/throttle/throttle.constants';

import { CreatePromotionDto } from './dto/create-promotion.dto';
import { QueryPromotionsDto } from './dto/query-promotions.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HOST')
@ApiBearerAuth()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'List promotions for properties owned by the host' })
  @ApiOkResponse({ description: 'Paginated promotions' })
  @ApiStandardErrors()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query() dto: QueryPromotionsDto,
  ): Promise<PaginatedResponse<PromotionSummary>> {
    return this.promotionsService.findByHost(user.userId, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Create a promotion for a property' })
  @ApiCreatedResponse({ description: 'Created promotion and guest notification count' })
  @ApiStandardErrors()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePromotionDto,
  ): Promise<CreatePromotionResult> {
    return this.promotionsService.create(user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Delete a promotion owned by the host' })
  @ApiStandardErrors()
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.promotionsService.remove(user.userId, id);
  }
}
