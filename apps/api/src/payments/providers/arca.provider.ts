import { Injectable, NotImplementedException } from '@nestjs/common';
import type { Booking } from '@repo/database/client';

import {
  AbstractPaymentProvider,
  type CheckoutInitResult,
  type WebhookResult,
} from '../payment-provider.interface';

@Injectable()
export class ArcaProvider extends AbstractPaymentProvider {
  readonly provider = 'ARCA' as const;

  initiate(_booking: Booking): Promise<CheckoutInitResult> {
    throw new NotImplementedException(
      'ArCa payment integration is not implemented yet. Configure merchant credentials and complete handshake.',
    );
  }

  handleWebhook(_payload: unknown, _signature?: string): Promise<WebhookResult> {
    throw new NotImplementedException('ArCa webhook handling is not implemented yet.');
  }
}
