import {
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
import type { PaginatedResponse, PropertySummary } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { WRITE_THROTTLE } from '../common/throttle/throttle.constants';

import { QueryFavoritesDto } from './dto/query-favorites.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GUEST')
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('ids')
  @ApiOperation({ summary: 'List favorited property IDs for the current guest' })
  @ApiOkResponse({ description: 'Array of property IDs' })
  @ApiStandardErrors()
  listIds(@CurrentUser() user: RequestUser): Promise<string[]> {
    return this.favoritesService.listIds(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List favorited properties with filters and pagination' })
  @ApiOkResponse({ description: 'Paginated property summaries' })
  @ApiStandardErrors()
  list(
    @CurrentUser() user: RequestUser,
    @Query() dto: QueryFavoritesDto,
  ): Promise<PaginatedResponse<PropertySummary>> {
    return this.favoritesService.list(user.userId, dto);
  }

  @Post(':propertyId')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Add a property to favorites' })
  @ApiCreatedResponse({ description: 'Property favorited' })
  @ApiStandardErrors({ notFound: true })
  add(
    @CurrentUser() user: RequestUser,
    @Param('propertyId') propertyId: string,
  ): Promise<{ propertyId: string }> {
    return this.favoritesService.add(user.userId, propertyId);
  }

  @Delete(':propertyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Remove a property from favorites' })
  @ApiOkResponse({ description: 'Favorite removed' })
  @ApiStandardErrors({ notFound: true })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('propertyId') propertyId: string,
  ): Promise<void> {
    await this.favoritesService.remove(user.userId, propertyId);
  }
}
