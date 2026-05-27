import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { Booking } from '@repo/database/client';

import {
  AbstractPaymentProvider,
  type CheckoutInitResult,
  type WebhookResult,
} from '../payment-provider.interface';

@Injectable()
export class CashProvider extends AbstractPaymentProvider {
  readonly provider = 'CASH' as const;

  initiate(_booking: Booking): Promise<CheckoutInitResult> {
    return Promise.resolve({
      provider: this.provider,
      externalRef: `cash_${randomUUID()}`,
      redirectUrl: null,
      qrCode: null,
      status: 'PENDING',
    });
  }

  handleWebhook(payload: unknown): Promise<WebhookResult> {
    const ref =
      typeof payload === 'object' && payload !== null && 'externalRef' in payload
        ? String((payload as { externalRef: unknown }).externalRef)
        : '';
    return Promise.resolve({
      externalRef: ref,
      status: 'PAID',
      rawPayload: payload,
    });
  }
}
