import { Injectable, NotImplementedException } from '@nestjs/common';
import type { Booking } from '@repo/database/client';

import {
  AbstractPaymentProvider,
  type CheckoutInitResult,
  type WebhookResult,
} from '../payment-provider.interface';

@Injectable()
export class IdramProvider extends AbstractPaymentProvider {
  readonly provider = 'IDRAM' as const;

  initiate(_booking: Booking): Promise<CheckoutInitResult> {
    throw new NotImplementedException(
      'Idram payment integration is not implemented yet. Configure merchant credentials and complete handshake.',
    );
  }

  handleWebhook(_payload: unknown, _signature?: string): Promise<WebhookResult> {
    throw new NotImplementedException('Idram webhook handling is not implemented yet.');
  }
}
