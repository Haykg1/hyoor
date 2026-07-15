import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { resolveCountryFromRequest } from '../common/utils/geo-ip';

import { CurrencyService } from './currency.service';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('display-default')
  @ApiOperation({ summary: 'Resolve the guest default display currency from request geo' })
  @ApiOkResponse({ description: 'ISO currency code for display estimates' })
  @ApiStandardErrors({ auth: false })
  getDisplayDefault(@Req() req: Request): { currency: string } {
    return {
      currency: this.currencyService.resolveDisplayCurrency(resolveCountryFromRequest(req)),
    };
  }
}
