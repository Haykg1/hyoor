import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CurrencyService } from '../currency/currency.service';

@Injectable()
export class CurrencyRatesCronService {
  private readonly logger = new Logger(CurrencyRatesCronService.name);

  constructor(private readonly currencyService: CurrencyService) {}

  @Cron('0 3 * * *')
  async refreshRates(): Promise<void> {
    try {
      await this.currencyService.refreshRates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh currency rates: ${message}`);
    }
  }
}
