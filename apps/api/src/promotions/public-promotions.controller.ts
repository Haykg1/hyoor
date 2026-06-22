import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HotDealProperty } from '@repo/shared';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@Controller('promotions')
export class PublicPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('hot-deals')
  @ApiOperation({
    summary: 'Get up to 10 properties with active DATE_RANGE promotions expiring within 72 hours',
  })
  @ApiOkResponse({ description: 'Hot deal properties with discount info' })
  @ApiStandardErrors({ auth: false })
  getHotDeals(): Promise<HotDealProperty[]> {
    return this.promotionsService.getHotDeals();
  }
}
