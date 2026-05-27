import { BadRequestException, Injectable } from '@nestjs/common';
import type { PaymentProvider } from '@repo/database/client';

import { AbstractPaymentProvider } from './payment-provider.interface';
import { ArcaProvider } from './providers/arca.provider';
import { CashProvider } from './providers/cash.provider';
import { IdramProvider } from './providers/idram.provider';

@Injectable()
export class PaymentsRegistry {
  private readonly providers: Map<PaymentProvider, AbstractPaymentProvider>;

  constructor(idram: IdramProvider, arca: ArcaProvider, cash: CashProvider) {
    this.providers = new Map<PaymentProvider, AbstractPaymentProvider>([
      [idram.provider, idram],
      [arca.provider, arca],
      [cash.provider, cash],
    ]);
  }

  get(provider: PaymentProvider): AbstractPaymentProvider {
    const impl = this.providers.get(provider);
    if (!impl) {
      throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }
    return impl;
  }
}
