import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CurrencyRatesPayload } from '@repo/shared';
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

  @Get('rates')
  @ApiOperation({ summary: 'Get cached FX rates (USD pivot) for cosmetic display conversion' })
  @ApiOkResponse({ description: 'Currency rates payload' })
  @ApiStandardErrors({ auth: false })
  async getRates(): Promise<CurrencyRatesPayload> {
    const rates = await this.currencyService.getRates();
    if (!rates) {
      return { base: 'USD', rates: {}, fetchedAt: null };
    }
    return {
      base: rates.base,
      rates: rates.rates,
      fetchedAt: rates.fetchedAt,
    };
  }
}
