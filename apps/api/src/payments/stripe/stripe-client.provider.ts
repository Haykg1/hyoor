import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import type { AppConfig } from '../../config/configuration';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export function stripeClientFactory(config: ConfigService<AppConfig, true>): Stripe {
  const secretKey = config.get('stripe.secretKey', { infer: true });
  return new Stripe(secretKey, {
    typescript: true,
  });
}

export const StripeClientProvider = {
  provide: STRIPE_CLIENT,
  useFactory: stripeClientFactory,
  inject: [ConfigService],
};
