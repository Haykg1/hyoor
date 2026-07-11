import { Injectable } from '@nestjs/common';
import type { HostProfile } from '@repo/database/client';

import { PrismaService } from '../../src/database/prisma.service';

/**
 * Stands in for real Stripe Connect onboarding in e2e tests — marks the host as
 * immediately payout-ready instead of requiring interactive onboarding, since e2e
 * specs exercise booking/payment business logic, not the Stripe integration itself
 * (that's covered by manual verification against the real Stripe test dashboard).
 */
@Injectable()
export class MockStripeConnectService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccountAndOnboardingLink(
    hostProfile: HostProfile,
  ): Promise<{ onboardingUrl: string }> {
    await this.prisma.hostProfile.update({
      where: { id: hostProfile.id },
      data: {
        stripeAccountId: hostProfile.stripeAccountId ?? `acct_mock_${hostProfile.id}`,
        stripeDetailsSubmitted: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
    });
    return { onboardingUrl: 'https://connect.stripe.test/mock-onboarding' };
  }

  async createFreshOnboardingLink(): Promise<{ onboardingUrl: string }> {
    return { onboardingUrl: 'https://connect.stripe.test/mock-onboarding' };
  }

  async createLoginLink(): Promise<{ loginUrl: string }> {
    return { loginUrl: 'https://connect.stripe.test/mock-login' };
  }

  async syncAccountStatus(): Promise<void> {}
}
