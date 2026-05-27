import type { Booking, PaymentProvider } from '@repo/database/client';

export interface CheckoutInitResult {
  provider: PaymentProvider;
  externalRef: string;
  redirectUrl?: string | null;
  qrCode?: string | null;
  status: 'PENDING' | 'PAID';
}

export interface WebhookResult {
  externalRef: string;
  status: 'PAID' | 'FAILED' | 'REFUNDED';
  rawPayload: unknown;
}

export abstract class AbstractPaymentProvider {
  abstract readonly provider: PaymentProvider;
  abstract initiate(booking: Booking): Promise<CheckoutInitResult>;
  abstract handleWebhook(payload: unknown, signature?: string): Promise<WebhookResult>;
}
