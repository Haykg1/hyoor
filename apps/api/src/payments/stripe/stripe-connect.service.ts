import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HostProfile } from '@repo/database/client';
import Stripe from 'stripe';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';

import { STRIPE_CLIENT } from './stripe-client.provider';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Creates a Stripe Express account for the host if one doesn't exist yet, then
   * returns a fresh onboarding link. Called immediately after host-profile creation,
   * and again whenever a host needs to resume/restart onboarding (links expire fast).
   */
  async createAccountAndOnboardingLink(
    hostProfile: HostProfile & { user: { email: string } },
  ): Promise<{
    onboardingUrl: string;
  }> {
    let accountId = hostProfile.stripeAccountId;
    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: this.config.get('stripe.connectDefaultCountry', { infer: true }),
        email: hostProfile.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: hostProfile.hostType === 'COMPANY' ? 'company' : 'individual',
      });
      accountId = account.id;
      await this.prisma.hostProfile.update({
        where: { id: hostProfile.id },
        data: { stripeAccountId: accountId },
      });
    }
    const onboardingUrl = await this.createOnboardingLink(accountId);
    return { onboardingUrl };
  }

  async createFreshOnboardingLink(hostProfile: HostProfile): Promise<{ onboardingUrl: string }> {
    if (!hostProfile.stripeAccountId) {
      throw new Error('Host has no Stripe Connect account yet');
    }
    const onboardingUrl = await this.createOnboardingLink(hostProfile.stripeAccountId);
    return { onboardingUrl };
  }

  async createLoginLink(hostProfile: HostProfile): Promise<{ loginUrl: string }> {
    if (!hostProfile.stripeAccountId) {
      throw new Error('Host has no Stripe Connect account yet');
    }
    const link = await this.stripe.accounts.createLoginLink(hostProfile.stripeAccountId);
    return { loginUrl: link.url };
  }

  private async createOnboardingLink(accountId: string): Promise<string> {
    const frontendUrl = this.config.get('frontend.url', { infer: true });
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${frontendUrl}/dashboard/payouts?refresh=1`,
      return_url: `${frontendUrl}/dashboard/payouts?onboarded=1`,
    });
    return link.url;
  }

  /** Reconciles onboarding/payouts flags from a Stripe `account.updated` webhook event. */
  async syncAccountStatus(account: Stripe.Account): Promise<void> {
    const hostProfile = await this.prisma.hostProfile.findUnique({
      where: { stripeAccountId: account.id },
    });
    if (!hostProfile) {
      this.logger.warn(`account.updated for unknown Stripe account ${account.id}`);
      return;
    }
    await this.applyAccountStatus(hostProfile.id, account);
  }

  /**
   * Actively pulls the account status from Stripe instead of waiting on the
   * `account.updated` webhook — used when a host returns from onboarding so the
   * UI reflects reality even if the webhook is delayed or not wired up yet.
   */
  async refreshAccountStatus(hostProfile: HostProfile): Promise<HostProfile> {
    if (!hostProfile.stripeAccountId) {
      return hostProfile;
    }
    const account = await this.stripe.accounts.retrieve(hostProfile.stripeAccountId);
    return this.applyAccountStatus(hostProfile.id, account);
  }

  private async applyAccountStatus(
    hostProfileId: string,
    account: Stripe.Account,
  ): Promise<HostProfile> {
    return this.prisma.hostProfile.update({
      where: { id: hostProfileId },
      data: {
        stripeDetailsSubmitted: account.details_submitted ?? false,
        stripeChargesEnabled: account.charges_enabled ?? false,
        stripePayoutsEnabled: account.payouts_enabled ?? false,
      },
    });
  }
}
